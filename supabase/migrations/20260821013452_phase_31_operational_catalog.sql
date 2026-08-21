-- event-contract-sha256: 590e8e229c105dabd38a45c92dbf2d5b159dd36918c60a8817f78637b39faf74
-- Phase 31 keeps these admission aids private: they are not a business
-- projection and receive no Data API/browser table grants.
create table birdnerd_private.entity_reference_index (
  workspace_id uuid not null,
  entity_id uuid not null,
  entity_kind text not null check (entity_kind in ('station','net','person','bander','band','session','banding-record')),
  created_event_id uuid not null,
  primary key (workspace_id, entity_id),
  unique (entity_id)
);
alter table birdnerd_private.entity_reference_index enable row level security;
revoke all on birdnerd_private.entity_reference_index from public, anon, authenticated, birdnerd_provisioner;

-- The provisioner has EXECUTE-only access. These functions intentionally use
-- a fixed empty search path and construct every membership Event themselves.
create or replace function birdnerd_private.change_membership(
  operation text, target_workspace_id uuid, target_membership_id uuid, target_email text, next_role text, provisioner_id text
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  membership birdnerd_private.membership_index%rowtype;
  command_id uuid := birdnerd_private.uuid_v7();
  event_id uuid := birdnerd_private.uuid_v7();
  event_type text;
  event jsonb;
  now_text text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  physical_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  if operation not in ('invite','set-role','deactivate','reactivate') or nullif(btrim(provisioner_id),'') is null then raise exception 'Invalid membership operation.'; end if;
  -- Serialize Membership changes per Workspace so two concurrent demotions or
  -- deactivations cannot both observe the same last active Admin.
  perform pg_advisory_xact_lock(hashtext(target_workspace_id::text));
  if operation = 'invite' then
    if lower(btrim(coalesce(target_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or next_role not in ('admin','contributor') then raise exception 'Invite requires normalized email and role.'; end if;
    select * into membership from birdnerd_private.membership_index where workspace_id=target_workspace_id and email=lower(btrim(target_email)) for update;
    if found then return jsonb_build_object('workspace_id',target_workspace_id,'membership_id',membership.membership_id,'command_id',command_id,'events','[]'::jsonb); end if;
    target_membership_id := birdnerd_private.uuid_v7(); event_type := 'membership.preauthorized';
    insert into birdnerd_private.membership_index (membership_id,workspace_id,email,role,status) values (target_membership_id,target_workspace_id,lower(btrim(target_email)),next_role,'pending');
  else
    if operation = 'set-role' and next_role not in ('admin','contributor') then raise exception 'set-role requires admin or contributor.'; end if;
    select * into membership from birdnerd_private.membership_index where membership_id=target_membership_id and workspace_id=target_workspace_id for update;
    if not found then raise exception 'Membership does not belong to Workspace.'; end if;
    if operation in ('set-role','deactivate') and membership.role='admin' and membership.status='active'
      and (operation='deactivate' or next_role <> 'admin')
      and not exists (select 1 from birdnerd_private.membership_index where workspace_id=target_workspace_id and status='active' and role='admin' and membership_id <> target_membership_id) then raise exception 'Cannot remove the last active Admin.'; end if;
    event_type := case operation when 'set-role' then 'membership.role-changed' when 'deactivate' then 'membership.deactivated' else 'membership.reactivated' end;
    update birdnerd_private.membership_index set role=case when operation='set-role' then next_role else role end, status=case when operation='deactivate' then 'inactive' when operation='reactivate' then 'active' else status end where membership_id=target_membership_id;
  end if;
  event := jsonb_build_object('event_id',event_id,'event_type',event_type,'event_schema_version',1,'event_envelope_version',2,'workspace_id',target_workspace_id,'command_id',command_id,'occurred_at',now_text,'hlc',jsonb_build_object('physical_ms',physical_ms,'logical',0),'actor',jsonb_build_object('kind','restricted-provisioner','provisioner_id',provisioner_id),'payload',case when operation='invite' then jsonb_build_object('membership_id',target_membership_id,'email',lower(btrim(target_email)),'role',next_role) when operation='set-role' then jsonb_build_object('membership_id',target_membership_id,'role',next_role) else jsonb_build_object('membership_id',target_membership_id) end);
  perform birdnerd_private.insert_event(event);
  return jsonb_build_object('workspace_id',target_workspace_id,'membership_id',target_membership_id,'command_id',command_id,'events',jsonb_build_array(event));
end $$;
create or replace function birdnerd_private.invite_membership(uuid,uuid,text,text,text) returns jsonb language sql security definer set search_path='' as 'select birdnerd_private.change_membership(''invite'',$1,$2,$3,$4,$5)';
create or replace function birdnerd_private.set_role_membership(uuid,uuid,text,text,text) returns jsonb language sql security definer set search_path='' as 'select birdnerd_private.change_membership(''set-role'',$1,$2,$3,$4,$5)';
create or replace function birdnerd_private.deactivate_membership(uuid,uuid,text,text,text) returns jsonb language sql security definer set search_path='' as 'select birdnerd_private.change_membership(''deactivate'',$1,$2,$3,$4,$5)';
create or replace function birdnerd_private.reactivate_membership(uuid,uuid,text,text,text) returns jsonb language sql security definer set search_path='' as 'select birdnerd_private.change_membership(''reactivate'',$1,$2,$3,$4,$5)';
revoke all on function birdnerd_private.change_membership(text,uuid,uuid,text,text,text) from public;
revoke all on function birdnerd_private.invite_membership(uuid,uuid,text,text,text), birdnerd_private.set_role_membership(uuid,uuid,text,text,text), birdnerd_private.deactivate_membership(uuid,uuid,text,text,text), birdnerd_private.reactivate_membership(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function birdnerd_private.invite_membership(uuid,uuid,text,text,text), birdnerd_private.set_role_membership(uuid,uuid,text,text,text), birdnerd_private.deactivate_membership(uuid,uuid,text,text,text), birdnerd_private.reactivate_membership(uuid,uuid,text,text,text) to birdnerd_provisioner;

-- The catalog has exact named fields even though every scientific observation
-- is optional. Omission preserves an amended field; JSON null explicitly
-- clears it. Keeping that distinction at admission prevents a browser from
-- smuggling an unreviewed field or malformed structural reference into the Log.
create or replace function birdnerd_private.valid_optional_fields(
  fields jsonb, allowed text[], string_fields text[], number_fields text[], boolean_fields text[], uuid_fields text[], validate_band_selection boolean default false
) returns boolean language plpgsql immutable set search_path='' as $$
declare field_name text; selection jsonb;
begin
  if jsonb_typeof(fields) <> 'object' or not birdnerd_private.has_exact_keys(fields, array[]::text[], allowed) then return false; end if;
  foreach field_name in array string_fields loop if fields ? field_name and jsonb_typeof(fields -> field_name) not in ('string','null') then return false; end if; end loop;
  foreach field_name in array number_fields loop if fields ? field_name and jsonb_typeof(fields -> field_name) not in ('number','null') then return false; end if; end loop;
  foreach field_name in array boolean_fields loop if fields ? field_name and jsonb_typeof(fields -> field_name) not in ('boolean','null') then return false; end if; end loop;
  foreach field_name in array uuid_fields loop if fields ? field_name and jsonb_typeof(fields -> field_name) <> 'null' and (jsonb_typeof(fields -> field_name) <> 'string' or not birdnerd_private.is_uuid_v7(fields ->> field_name)) then return false; end if; end loop;
  if not validate_band_selection or not (fields ? 'band_selection') or jsonb_typeof(fields -> 'band_selection') = 'null' then return true; end if;
  selection := fields -> 'band_selection';
  if jsonb_typeof(selection) <> 'object' then return false; end if;
  if selection ->> 'kind' = 'managed' then return birdnerd_private.has_exact_keys(selection,array['kind','band_id','band_number']) and birdnerd_private.is_uuid_v7(selection ->> 'band_id') and jsonb_typeof(selection -> 'band_number') = 'string'; end if;
  if selection ->> 'kind' = 'foreign' then return birdnerd_private.has_exact_keys(selection,array['kind','band_number']) and jsonb_typeof(selection -> 'band_number') = 'string'; end if;
  return selection ->> 'kind' = 'unbanded' and birdnerd_private.has_exact_keys(selection,array['kind']);
end $$;
create or replace function birdnerd_private.valid_session_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields,
    array['session_date','location_name','station_id','protocol','maps_period','open_time','close_time','master_bander_id','weather_open_temp','weather_open_wind','weather_open_cloud','weather_open_precip','weather_close_temp','weather_close_wind','weather_close_cloud','weather_close_precip','notes'],
    array['session_date','location_name','protocol','open_time','close_time','weather_open_precip','weather_close_precip','notes'],
    array['maps_period','weather_open_temp','weather_open_wind','weather_open_cloud','weather_close_temp','weather_close_wind','weather_close_cloud'],
    array[]::text[], array['station_id','master_bander_id']);
$$;
create or replace function birdnerd_private.valid_station_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields, array['name'], array['name'], array[]::text[], array[]::text[], array[]::text[]);
$$;
create or replace function birdnerd_private.valid_net_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields, array['label','station_id'], array['label'], array[]::text[], array[]::text[], array['station_id']);
$$;
create or replace function birdnerd_private.valid_person_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields, array['name','initials'], array['name','initials'], array[]::text[], array[]::text[], array[]::text[]);
$$;
create or replace function birdnerd_private.valid_bander_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields, array['role','person_id'], array['role'], array[]::text[], array[]::text[], array['person_id']);
$$;
create or replace function birdnerd_private.valid_band_fields(fields jsonb, allow_band_number boolean default true) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(
    fields,
    case when allow_band_number then array['band_number','band_size','band_type'] else array['band_size','band_type'] end,
    case when allow_band_number then array['band_number','band_size','band_type'] else array['band_size','band_type'] end,
    array[]::text[], array[]::text[], array[]::text[]);
$$;
create or replace function birdnerd_private.valid_banding_record_fields(fields jsonb) returns boolean language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(fields,
    array['species_code','band_number','capture_code','wrp','age','how_aged','how_aged_2','sex','how_sexed','how_sexed_2','skull','cp','bp','fat','body_molt','ff_molt','ff_wear','juv_body_plumage','molt_limits_p_covs','molt_limits_s_covs','molt_limits_alula','molt_limits_pp','molt_limits_ss','molt_limits_tert','molt_limits_rec','molt_limits_body_plum','molt_limits_non_feather','wing','tail','tarsus','exposed_culmen','other_measurement','body_mass','status','disposition','capture_time','release_time','net_id','bander_id','present_condition','replaced_band_number','notes','feather_pull','blood_sample','band_selection'],
    array['species_code','band_number','capture_code','wrp','age','how_aged','how_aged_2','sex','how_sexed','how_sexed_2','skull','cp','bp','fat','body_molt','ff_molt','ff_wear','juv_body_plumage','molt_limits_p_covs','molt_limits_s_covs','molt_limits_alula','molt_limits_pp','molt_limits_ss','molt_limits_tert','molt_limits_rec','molt_limits_body_plum','molt_limits_non_feather','status','disposition','capture_time','release_time','present_condition','replaced_band_number','notes'],
    array['wing','tail','tarsus','exposed_culmen','other_measurement','body_mass'], array['feather_pull','blood_sample'], array['net_id','bander_id'], true);
$$;
create or replace function birdnerd_private.validate_event(event jsonb) returns text language plpgsql immutable set search_path='' as $$
declare event_type text := event ->> 'event_type'; payload jsonb := event -> 'payload'; actor jsonb := event -> 'actor';
begin
  if not birdnerd_private.has_exact_keys(event, array['event_id','event_type','event_schema_version','event_envelope_version','workspace_id','command_id','occurred_at','hlc','actor','payload']) then return 'Event envelope keys are invalid.'; end if;
  if not birdnerd_private.is_uuid_v7(event ->> 'event_id') or not birdnerd_private.is_uuid_v7(event ->> 'workspace_id') or not birdnerd_private.is_uuid_v7(event ->> 'command_id') then return 'Event identifiers must be canonical UUIDv7 values.'; end if;
  if event -> 'event_envelope_version' <> '2'::jsonb or not birdnerd_private.is_rfc3339(event ->> 'occurred_at') then return 'Event envelope version or occurred_at is invalid.'; end if;
  if not birdnerd_private.has_exact_keys(event -> 'hlc', array['physical_ms','logical']) or not birdnerd_private.is_safe_nonnegative_integer(event -> 'hlc' -> 'physical_ms') or not birdnerd_private.is_safe_nonnegative_integer(event -> 'hlc' -> 'logical') then return 'HLC values are invalid.'; end if;
  if jsonb_typeof(actor) <> 'object' or jsonb_typeof(payload) <> 'object' then return 'Event actor and payload must be objects.'; end if;
  if actor ->> 'kind' = 'user-account' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','user_account_id']) or not birdnerd_private.is_uuid_v7(actor ->> 'user_account_id') then return 'User Account actor is invalid.'; end if;
  elsif actor ->> 'kind' = 'restricted-provisioner' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','provisioner_id']) or coalesce(actor ->> 'provisioner_id','') = '' then return 'Restricted Provisioner actor is invalid.'; end if;
  elsif actor ->> 'kind' = 'external-identity' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','identity']) or not birdnerd_private.has_exact_keys(actor -> 'identity', array['provider','subject','email']) or actor -> 'identity' ->> 'provider' <> 'google' or coalesce(actor -> 'identity' ->> 'subject','') = '' or actor -> 'identity' ->> 'email' <> lower(btrim(actor -> 'identity' ->> 'email')) then return 'External identity actor is invalid.'; end if;
  else return 'Event actor kind is unsupported.'; end if;
  if (event_type in ('session.created','banding-record.created','banding-record.fields-amended') and event ->> 'event_schema_version' not in ('1','2')) or (event_type not in ('session.created','banding-record.created','banding-record.fields-amended') and event -> 'event_schema_version' <> '1'::jsonb) then return 'Event schema version is unsupported.'; end if;
  if event_type = 'workspace.created' then
    if not birdnerd_private.has_exact_keys(payload, array['workspace_id','name'])
      or not birdnerd_private.optional_strings(payload, array['workspace_id','name'])
      or payload ->> 'workspace_id' <> event ->> 'workspace_id'
      or not birdnerd_private.is_uuid_v7(payload ->> 'workspace_id')
      or coalesce(payload ->> 'name', '') = '' then return 'workspace.created payload is invalid.'; end if;
  elsif event_type = 'membership.preauthorized' then
    if not birdnerd_private.has_exact_keys(payload, array['membership_id','email','role'])
      or not birdnerd_private.optional_strings(payload, array['membership_id','email','role'])
      or not birdnerd_private.is_uuid_v7(payload ->> 'membership_id')
      or payload ->> 'email' <> lower(btrim(payload ->> 'email'))
      or payload ->> 'role' not in ('admin','contributor') then return 'membership.preauthorized payload is invalid.'; end if;
  elsif event_type = 'user-account.linked' then
    if not birdnerd_private.has_exact_keys(payload, array['user_account_id','identity'])
      or jsonb_typeof(payload -> 'user_account_id') <> 'string'
      or not birdnerd_private.is_uuid_v7(payload ->> 'user_account_id')
      or payload -> 'identity' <> actor -> 'identity' then return 'user-account.linked payload is invalid.'; end if;
  elsif event_type = 'membership.activated' then
    if not birdnerd_private.has_exact_keys(payload, array['membership_id','user_account_id'])
      or not birdnerd_private.optional_strings(payload, array['membership_id','user_account_id'])
      or not birdnerd_private.is_uuid_v7(payload ->> 'membership_id')
      or not birdnerd_private.is_uuid_v7(payload ->> 'user_account_id') then return 'membership.activated payload is invalid.'; end if;
  elsif event_type = 'station.created' then if not birdnerd_private.has_exact_keys(payload,array['station_id'],array['fields']) then return 'station.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.valid_station_fields(payload -> 'fields') then return 'station fields invalid.'; end if;
  elsif event_type = 'station.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['station_id','fields']) or not birdnerd_private.valid_station_fields(payload -> 'fields') then return 'station.fields-amended payload is invalid.'; end if;
  elsif event_type = 'station.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['station_id']) then return 'station.deactivated payload is invalid.'; end if;
  elsif event_type = 'station.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['station_id']) then return 'station.reactivated payload is invalid.'; end if;
  elsif event_type = 'net.created' then if not birdnerd_private.has_exact_keys(payload,array['net_id','station_id'],array['fields']) then return 'net.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.valid_net_fields(payload -> 'fields') then return 'net fields invalid.'; end if;
  elsif event_type = 'net.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['net_id','fields']) or not birdnerd_private.valid_net_fields(payload -> 'fields') then return 'net.fields-amended payload is invalid.'; end if;
  elsif event_type = 'net.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['net_id']) then return 'net.deactivated payload is invalid.'; end if;
  elsif event_type = 'net.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['net_id']) then return 'net.reactivated payload is invalid.'; end if;
  elsif event_type = 'person.created' then if not birdnerd_private.has_exact_keys(payload,array['person_id'],array['fields']) then return 'person.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.valid_person_fields(payload -> 'fields') then return 'person fields invalid.'; end if;
  elsif event_type = 'person.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['person_id','fields']) or not birdnerd_private.valid_person_fields(payload -> 'fields') then return 'person.fields-amended payload is invalid.'; end if;
  elsif event_type = 'person.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['person_id']) then return 'person.deactivated payload is invalid.'; end if;
  elsif event_type = 'person.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['person_id']) then return 'person.reactivated payload is invalid.'; end if;
  elsif event_type = 'bander.created' then if not birdnerd_private.has_exact_keys(payload,array['bander_id','person_id'],array['fields']) then return 'bander.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.valid_bander_fields(payload -> 'fields') then return 'bander fields invalid.'; end if;
  elsif event_type = 'bander.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['bander_id','fields']) or not birdnerd_private.valid_bander_fields(payload -> 'fields') then return 'bander.fields-amended payload is invalid.'; end if;
  elsif event_type = 'bander.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['bander_id']) then return 'bander.deactivated payload is invalid.'; end if;
  elsif event_type = 'bander.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['bander_id']) then return 'bander.reactivated payload is invalid.'; end if;
  elsif event_type = 'band.received' then if not birdnerd_private.has_exact_keys(payload,array['band_id','band_number'],array['fields']) then return 'band.received payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.valid_band_fields(payload -> 'fields', false) then return 'band fields invalid.'; end if;
  elsif event_type = 'band.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['band_id','fields']) or not birdnerd_private.valid_band_fields(payload -> 'fields') then return 'band.fields-amended payload is invalid.'; end if;
  elsif event_type = 'band.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['band_id']) then return 'band.deactivated payload is invalid.'; end if;
  elsif event_type = 'band.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['band_id']) then return 'band.reactivated payload is invalid.'; end if;
  elsif event_type = 'session.created' then
    if event ->> 'event_schema_version' = '1' then
      if not birdnerd_private.has_exact_keys(payload,array['session_id'],array['session_date','location_name','protocol','notes']) or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') or not birdnerd_private.optional_strings(payload,array['session_id','session_date','location_name','protocol','notes']) then return 'session.created v1 payload is invalid.'; end if;
    elsif not birdnerd_private.has_exact_keys(payload,array['session_id','fields']) or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') or not birdnerd_private.valid_session_fields(payload -> 'fields') then return 'session.created v2 payload is invalid.'; end if;
  elsif event_type = 'session.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['session_id','fields']) or not birdnerd_private.has_exact_keys(payload -> 'fields','{}',array['session_date','location_name','station_id','protocol','maps_period','open_time','close_time','master_bander_id','weather_open_temp','weather_open_wind','weather_open_cloud','weather_open_precip','weather_close_temp','weather_close_wind','weather_close_cloud','weather_close_precip','notes']) or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') or not birdnerd_private.valid_session_fields(payload -> 'fields') then return 'session.fields-amended payload is invalid.'; end if;
  elsif event_type = 'session.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['session_id']) then return 'session.deactivated payload is invalid.'; end if;
  elsif event_type = 'session.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['session_id']) then return 'session.reactivated payload is invalid.'; end if;
  elsif event_type = 'session-crew-member.added' then if not birdnerd_private.has_exact_keys(payload,array['session_id','bander_id']) then return 'crew payload invalid.'; end if;
  elsif event_type = 'session-crew-member.removed' then if not birdnerd_private.has_exact_keys(payload,array['session_id','bander_id']) then return 'crew payload invalid.'; end if;
  elsif event_type = 'banding-record.created' then
    if event ->> 'event_schema_version' = '1' then
      if not birdnerd_private.has_exact_keys(payload,array['record_id','session_id'],array['band_number','species_code','age','sex','capture_time','notes']) or not birdnerd_private.is_uuid_v7(payload ->> 'record_id') or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') or not birdnerd_private.optional_strings(payload,array['record_id','session_id','band_number','species_code','age','sex','capture_time','notes']) then return 'banding-record.created v1 payload is invalid.'; end if;
    elsif not birdnerd_private.has_exact_keys(payload,array['record_id','session_id','fields']) or not birdnerd_private.is_uuid_v7(payload ->> 'record_id') or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') or not birdnerd_private.valid_banding_record_fields(payload -> 'fields') then return 'banding-record.created v2 payload is invalid.'; end if;
  elsif event_type = 'banding-record.fields-amended' then
    if not birdnerd_private.has_exact_keys(payload,array['record_id','fields']) or not birdnerd_private.is_uuid_v7(payload ->> 'record_id') or jsonb_typeof(payload -> 'fields') <> 'object' or payload -> 'fields' = '{}'::jsonb then return 'banding-record.fields-amended payload is invalid.'; end if;
    if event ->> 'event_schema_version' = '1' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}',array['band_number','species_code','age','sex','capture_time','notes']) then return 'banding-record.fields-amended v1 fields are invalid.'; end if;
    if event ->> 'event_schema_version' = '2' and not birdnerd_private.valid_banding_record_fields(payload -> 'fields') then return 'banding-record.fields-amended v2 fields are invalid.'; end if;
  elsif event_type = 'banding-record.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['record_id']) or not birdnerd_private.is_uuid_v7(payload ->> 'record_id') then return 'record payload invalid.'; end if;
  elsif event_type = 'banding-record.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['record_id']) then return 'record payload invalid.'; end if;
  elsif event_type = 'membership.role-changed' then if not birdnerd_private.has_exact_keys(payload,array['membership_id','role']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'membership.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['membership_id']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'membership.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['membership_id']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'user-account.person-linked' then if not birdnerd_private.has_exact_keys(payload,array['user_account_id','person_id']) or not birdnerd_private.is_uuid_v7(payload ->> 'user_account_id') or not birdnerd_private.is_uuid_v7(payload ->> 'person_id') then return 'link payload invalid.'; end if;
  elsif event_type = 'user-account.person-unlinked' then if not birdnerd_private.has_exact_keys(payload,array['user_account_id']) or not birdnerd_private.is_uuid_v7(payload ->> 'user_account_id') then return 'unlink payload invalid.'; end if;
  else return 'Event type is unsupported.'; end if;
  return null;
end $$;

create or replace function birdnerd_private.minimum_field_role(event_type text) returns text
language sql immutable set search_path='' as $$
  select case
    when event_type in ('station.created','station.fields-amended','station.deactivated','station.reactivated','net.created','net.fields-amended','net.deactivated','net.reactivated','person.created','person.fields-amended','person.deactivated','person.reactivated','bander.created','bander.fields-amended','bander.deactivated','bander.reactivated','user-account.person-linked','user-account.person-unlinked') then 'admin'
    when event_type in ('band.received','band.fields-amended','band.deactivated','band.reactivated','session.created','session.fields-amended','session.deactivated','session.reactivated','session-crew-member.added','session-crew-member.removed','banding-record.created','banding-record.fields-amended','banding-record.deactivated','banding-record.reactivated') then 'contributor'
    else null end
$$;

-- Browser append remains an admission/exchange RPC, never a projector. A
-- missing referenced parent is retryable so independently exchanged facts can
-- converge; a known wrong kind or Workspace is permanent.
create or replace function public.birdnerd_append_events(events jsonb)
returns table (receipt jsonb) language plpgsql volatile security definer set search_path='' as $$
declare
  caller_id uuid := auth.uid(); event jsonb; event_type text; required_role text;
  membership birdnerd_private.membership_index%rowtype; existing birdnerd_private.event_log%rowtype;
  entity_id_text text; entity_kind text; reference_ids text[]; expected_kinds text[]; sequence bigint; result jsonb;
begin
  if caller_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 100 then raise exception 'Events must be an array of at most 100 items.'; end if;
  for event in select value from jsonb_array_elements(events) loop
    event_type := event ->> 'event_type'; required_role := birdnerd_private.minimum_field_role(event_type);
    if birdnerd_private.validate_event(event) is not null or required_role is null then
      result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason',coalesce(birdnerd_private.validate_event(event),'Event type is not accepted from Field.'),'permanent',true);
    else
      select * into membership from birdnerd_private.membership_index where workspace_id=(event ->> 'workspace_id')::uuid and auth_user_id=caller_id and status='active';
      if not found or event -> 'actor' ->> 'kind' <> 'user-account' or event -> 'actor' ->> 'user_account_id' <> membership.user_account_id::text then
        result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Actor is not an active Member of the target Workspace.','permanent',true);
      elsif required_role='admin' and membership.role <> 'admin' then
        result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Admin role is required for this Workspace configuration Event.','permanent',true);
      elsif event_type in ('user-account.person-linked','user-account.person-unlinked') and not exists (select 1 from birdnerd_private.membership_index where workspace_id=(event ->> 'workspace_id')::uuid and user_account_id=(event -> 'payload' ->> 'user_account_id')::uuid and status='active') then
        result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','User Account is not an active Member of the target Workspace.','permanent',true);
      else
        entity_kind := case event_type when 'station.created' then 'station' when 'net.created' then 'net' when 'person.created' then 'person' when 'bander.created' then 'bander' when 'band.received' then 'band' when 'session.created' then 'session' when 'banding-record.created' then 'banding-record' end;
        entity_id_text := case entity_kind when 'station' then event -> 'payload' ->> 'station_id' when 'net' then event -> 'payload' ->> 'net_id' when 'person' then event -> 'payload' ->> 'person_id' when 'bander' then event -> 'payload' ->> 'bander_id' when 'band' then event -> 'payload' ->> 'band_id' when 'session' then event -> 'payload' ->> 'session_id' when 'banding-record' then event -> 'payload' ->> 'record_id' end;
        reference_ids := case
          when event_type = 'net.created' then array[event -> 'payload' ->> 'station_id']
          when event_type = 'bander.created' then array[event -> 'payload' ->> 'person_id']
          when event_type in ('station.fields-amended','station.deactivated','station.reactivated') then array[event -> 'payload' ->> 'station_id']
          when event_type = 'net.fields-amended' then array[event -> 'payload' ->> 'net_id', event -> 'payload' -> 'fields' ->> 'station_id']
          when event_type in ('net.deactivated','net.reactivated') then array[event -> 'payload' ->> 'net_id']
          when event_type in ('person.fields-amended','person.deactivated','person.reactivated') then array[event -> 'payload' ->> 'person_id']
          when event_type = 'bander.fields-amended' then array[event -> 'payload' ->> 'bander_id', event -> 'payload' -> 'fields' ->> 'person_id']
          when event_type in ('bander.deactivated','bander.reactivated') then array[event -> 'payload' ->> 'bander_id']
          when event_type in ('band.fields-amended','band.deactivated','band.reactivated') then array[event -> 'payload' ->> 'band_id']
          when event_type = 'session.created' then array[case when event ->> 'event_schema_version' = '2' then event -> 'payload' -> 'fields' ->> 'station_id' end, case when event ->> 'event_schema_version' = '2' then event -> 'payload' -> 'fields' ->> 'master_bander_id' end]
          when event_type = 'session.fields-amended' then array[event -> 'payload' ->> 'session_id', event -> 'payload' -> 'fields' ->> 'station_id', event -> 'payload' -> 'fields' ->> 'master_bander_id']
          when event_type in ('session.deactivated','session.reactivated') then array[event -> 'payload' ->> 'session_id']
          when event_type in ('session-crew-member.added','session-crew-member.removed') then array[event -> 'payload' ->> 'session_id', event -> 'payload' ->> 'bander_id']
          when event_type = 'user-account.person-linked' then array[event -> 'payload' ->> 'person_id']
          when event_type = 'banding-record.created' then array[event -> 'payload' ->> 'session_id', event -> 'payload' -> 'fields' ->> 'net_id', event -> 'payload' -> 'fields' ->> 'bander_id', case when event -> 'payload' -> 'fields' -> 'band_selection' ->> 'kind' = 'managed' then event -> 'payload' -> 'fields' -> 'band_selection' ->> 'band_id' end]
          when event_type = 'banding-record.fields-amended' then array[event -> 'payload' ->> 'record_id', event -> 'payload' -> 'fields' ->> 'net_id', event -> 'payload' -> 'fields' ->> 'bander_id', case when event -> 'payload' -> 'fields' -> 'band_selection' ->> 'kind' = 'managed' then event -> 'payload' -> 'fields' -> 'band_selection' ->> 'band_id' end]
          when event_type in ('banding-record.deactivated','banding-record.reactivated') then array[event -> 'payload' ->> 'record_id']
          else array[]::text[] end;
        expected_kinds := case
          when event_type = 'net.created' then array['station']
          when event_type = 'bander.created' then array['person']
          when event_type in ('station.fields-amended','station.deactivated','station.reactivated') then array['station']
          when event_type = 'net.fields-amended' then array['net','station']
          when event_type in ('net.deactivated','net.reactivated') then array['net']
          when event_type in ('person.fields-amended','person.deactivated','person.reactivated') then array['person']
          when event_type = 'bander.fields-amended' then array['bander','person']
          when event_type in ('bander.deactivated','bander.reactivated') then array['bander']
          when event_type in ('band.fields-amended','band.deactivated','band.reactivated') then array['band']
          when event_type = 'session.created' then array['station','bander']
          when event_type = 'session.fields-amended' then array['session','station','bander']
          when event_type in ('session.deactivated','session.reactivated') then array['session']
          when event_type in ('session-crew-member.added','session-crew-member.removed') then array['session','bander']
          when event_type = 'user-account.person-linked' then array['person']
          when event_type = 'banding-record.created' then array['session','net','bander','band']
          when event_type = 'banding-record.fields-amended' then array['banding-record','net','bander','band']
          when event_type in ('banding-record.deactivated','banding-record.reactivated') then array['banding-record']
          else array[]::text[] end;
        if entity_id_text is not null and not birdnerd_private.is_uuid_v7(entity_id_text) then
          result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity identity is invalid.','permanent',true);
        elsif exists (select 1 from unnest(reference_ids) as refs(reference_id) where reference_id is not null and not birdnerd_private.is_uuid_v7(reference_id)) then
          result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity reference is invalid.','permanent',true);
        elsif exists (select 1 from unnest(reference_ids) with ordinality reference_id(id, position) where id is not null and exists (select 1 from birdnerd_private.entity_reference_index where entity_id=id::uuid) and not exists (select 1 from birdnerd_private.entity_reference_index as reference_index where reference_index.workspace_id=(event ->> 'workspace_id')::uuid and reference_index.entity_id=id::uuid and reference_index.entity_kind=expected_kinds[position])) then
          result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity reference has the wrong Workspace or kind.','permanent',true);
        elsif exists (select 1 from unnest(reference_ids) as refs(reference_id) where reference_id is not null and not exists (select 1 from birdnerd_private.entity_reference_index where entity_id=reference_id::uuid)) then
          result := jsonb_build_object('kind','deferred','event_id',event ->> 'event_id','reason','Referenced parent is not indexed yet.','retryable',true);
        else
          select * into existing from birdnerd_private.event_log where event_id=(event ->> 'event_id')::uuid;
          if found then result := case when existing.event_json=event then jsonb_build_object('kind','duplicate','event_id',event ->> 'event_id','server_sequence',existing.server_sequence) else jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Event ID conflicts with immutable content.','permanent',true) end;
          elsif entity_kind is not null and exists (select 1 from birdnerd_private.entity_reference_index where entity_id=entity_id_text::uuid) then
            result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity identity already exists.','permanent',true);
          else
            sequence := birdnerd_private.insert_event(event);
            if entity_kind is not null then insert into birdnerd_private.entity_reference_index(workspace_id,entity_id,entity_kind,created_event_id) values ((event ->> 'workspace_id')::uuid,entity_id_text::uuid,entity_kind,(event ->> 'event_id')::uuid); end if;
            result := jsonb_build_object('kind','accepted','event_id',event ->> 'event_id','server_sequence',sequence);
          end if;
        end if;
      end if;
    end if;
    insert into birdnerd_private.event_receipts(auth_user_id,event_id,receipt) values(caller_id,coalesce(event ->> 'event_id','<missing>'),result) on conflict(auth_user_id,event_id) do update set receipt=excluded.receipt, recorded_at=clock_timestamp();
    receipt := result; return next;
  end loop;
end $$;
