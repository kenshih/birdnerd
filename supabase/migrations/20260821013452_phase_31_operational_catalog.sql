-- event-contract-sha256: 7108eccd92aca84071363a9c9997ff15b87502aede838bc813aabb3b43f4c6ad
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
  if operation = 'invite' then
    if lower(btrim(coalesce(target_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or next_role not in ('admin','contributor') then raise exception 'Invite requires normalized email and role.'; end if;
    select * into membership from birdnerd_private.membership_index where workspace_id=target_workspace_id and email=lower(btrim(target_email)) for update;
    if found then return jsonb_build_object('workspace_id',target_workspace_id,'membership_id',membership.membership_id,'command_id',command_id,'events','[]'::jsonb); end if;
    target_membership_id := birdnerd_private.uuid_v7(); event_type := 'membership.preauthorized';
    insert into birdnerd_private.membership_index (membership_id,workspace_id,email,role,status) values (target_membership_id,target_workspace_id,lower(btrim(target_email)),next_role,'pending');
  else
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

-- Extend the structural validator before browser admission. Creation and
-- amendment fields are deliberately open value maps: their named form fields
-- are optional scientific observations; omission preserves and JSON null
-- clears at the operational Module.
create or replace function birdnerd_private.validate_event(event jsonb) returns text language plpgsql immutable set search_path='' as $$
declare event_type text := event ->> 'event_type'; payload jsonb := event -> 'payload';
begin
  if not birdnerd_private.has_exact_keys(event, array['event_id','event_type','event_schema_version','event_envelope_version','workspace_id','command_id','occurred_at','hlc','actor','payload']) then return 'Event envelope keys are invalid.'; end if;
  if coalesce((event ->> 'event_schema_version')::int, 0) < 1 then return 'Event schema version is invalid.'; end if;
  if event_type = 'station.created' then if not birdnerd_private.has_exact_keys(payload,array['station_id'],array['fields']) then return 'station.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'station fields invalid.'; end if;
  elsif event_type = 'station.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['station_id','fields']) then return 'station.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'station fields invalid.'; end if;
  elsif event_type = 'station.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['station_id']) then return 'station.deactivated payload is invalid.'; end if;
  elsif event_type = 'station.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['station_id']) then return 'station.reactivated payload is invalid.'; end if;
  elsif event_type = 'net.created' then if not birdnerd_private.has_exact_keys(payload,array['net_id','station_id'],array['fields']) then return 'net.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'net fields invalid.'; end if;
  elsif event_type = 'net.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['net_id','fields']) then return 'net.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'net fields invalid.'; end if;
  elsif event_type = 'net.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['net_id']) then return 'net.deactivated payload is invalid.'; end if;
  elsif event_type = 'net.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['net_id']) then return 'net.reactivated payload is invalid.'; end if;
  elsif event_type = 'person.created' then if not birdnerd_private.has_exact_keys(payload,array['person_id'],array['fields']) then return 'person.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'person fields invalid.'; end if;
  elsif event_type = 'person.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['person_id','fields']) then return 'person.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'person fields invalid.'; end if;
  elsif event_type = 'person.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['person_id']) then return 'person.deactivated payload is invalid.'; end if;
  elsif event_type = 'person.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['person_id']) then return 'person.reactivated payload is invalid.'; end if;
  elsif event_type = 'bander.created' then if not birdnerd_private.has_exact_keys(payload,array['bander_id','person_id'],array['fields']) then return 'bander.created payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'bander fields invalid.'; end if;
  elsif event_type = 'bander.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['bander_id','fields']) then return 'bander.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'bander fields invalid.'; end if;
  elsif event_type = 'bander.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['bander_id']) then return 'bander.deactivated payload is invalid.'; end if;
  elsif event_type = 'bander.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['bander_id']) then return 'bander.reactivated payload is invalid.'; end if;
  elsif event_type = 'band.received' then if not birdnerd_private.has_exact_keys(payload,array['band_id','band_number'],array['fields']) then return 'band.received payload is invalid.'; end if; if payload ? 'fields' and not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'band fields invalid.'; end if;
  elsif event_type = 'band.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['band_id','fields']) then return 'band.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'band fields invalid.'; end if;
  elsif event_type = 'band.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['band_id']) then return 'band.deactivated payload is invalid.'; end if;
  elsif event_type = 'band.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['band_id']) then return 'band.reactivated payload is invalid.'; end if;
  elsif event_type = 'session.fields-amended' then if not birdnerd_private.has_exact_keys(payload,array['session_id','fields']) then return 'session.fields-amended payload is invalid.'; end if; if not birdnerd_private.has_exact_keys(payload -> 'fields','{}') then return 'session fields invalid.'; end if;
  elsif event_type = 'session.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['session_id']) then return 'session.deactivated payload is invalid.'; end if;
  elsif event_type = 'session.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['session_id']) then return 'session.reactivated payload is invalid.'; end if;
  elsif event_type = 'session-crew-member.added' then if not birdnerd_private.has_exact_keys(payload,array['session_id','bander_id']) then return 'crew payload invalid.'; end if;
  elsif event_type = 'session-crew-member.removed' then if not birdnerd_private.has_exact_keys(payload,array['session_id','bander_id']) then return 'crew payload invalid.'; end if;
  elsif event_type = 'banding-record.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['record_id']) then return 'record payload invalid.'; end if;
  elsif event_type = 'banding-record.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['record_id']) then return 'record payload invalid.'; end if;
  elsif event_type = 'membership.role-changed' then if not birdnerd_private.has_exact_keys(payload,array['membership_id','role']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'membership.deactivated' then if not birdnerd_private.has_exact_keys(payload,array['membership_id']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'membership.reactivated' then if not birdnerd_private.has_exact_keys(payload,array['membership_id']) then return 'membership payload invalid.'; end if;
  elsif event_type = 'user-account.person-linked' then if not birdnerd_private.has_exact_keys(payload,array['user_account_id','person_id']) then return 'link payload invalid.'; end if;
  elsif event_type = 'user-account.person-unlinked' then if not birdnerd_private.has_exact_keys(payload,array['user_account_id']) then return 'unlink payload invalid.'; end if;
  else return null; end if;
  return null;
end $$;
