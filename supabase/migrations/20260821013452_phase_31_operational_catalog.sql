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
  entity_id_text text; entity_kind text; reference_id_text text; expected_kind text; sequence bigint; result jsonb;
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
      else
        entity_kind := case event_type when 'station.created' then 'station' when 'net.created' then 'net' when 'person.created' then 'person' when 'bander.created' then 'bander' when 'band.received' then 'band' when 'session.created' then 'session' when 'banding-record.created' then 'banding-record' end;
        entity_id_text := case entity_kind when 'station' then event -> 'payload' ->> 'station_id' when 'net' then event -> 'payload' ->> 'net_id' when 'person' then event -> 'payload' ->> 'person_id' when 'bander' then event -> 'payload' ->> 'bander_id' when 'band' then event -> 'payload' ->> 'band_id' when 'session' then event -> 'payload' ->> 'session_id' when 'banding-record' then event -> 'payload' ->> 'record_id' end;
        reference_id_text := case event_type when 'net.created' then event -> 'payload' ->> 'station_id' when 'bander.created' then event -> 'payload' ->> 'person_id' when 'session-crew-member.added' then event -> 'payload' ->> 'session_id' when 'session-crew-member.removed' then event -> 'payload' ->> 'session_id' when 'banding-record.created' then event -> 'payload' ->> 'session_id' else null end;
        expected_kind := case event_type when 'net.created' then 'station' when 'bander.created' then 'person' when 'session-crew-member.added' then 'session' when 'session-crew-member.removed' then 'session' when 'banding-record.created' then 'session' else null end;
        if entity_id_text is not null and not birdnerd_private.is_uuid_v7(entity_id_text) then
          result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity identity is invalid.','permanent',true);
        elsif reference_id_text is not null and not birdnerd_private.is_uuid_v7(reference_id_text) then
          result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity reference is invalid.','permanent',true);
        elsif reference_id_text is not null and not exists (select 1 from birdnerd_private.entity_reference_index where workspace_id=(event ->> 'workspace_id')::uuid and entity_id=reference_id_text::uuid and entity_kind=expected_kind) then
          if exists (select 1 from birdnerd_private.entity_reference_index where entity_id=reference_id_text::uuid) then result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Entity reference has the wrong Workspace or kind.','permanent',true);
          else result := jsonb_build_object('kind','deferred','event_id',event ->> 'event_id','reason','Referenced parent is not indexed yet.','retryable',true); end if;
        else
          select * into existing from birdnerd_private.event_log where event_id=(event ->> 'event_id')::uuid;
          if found then result := case when existing.event_json=event then jsonb_build_object('kind','duplicate','event_id',event ->> 'event_id','server_sequence',existing.server_sequence) else jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Event ID conflicts with immutable content.','permanent',true) end;
          else
            sequence := birdnerd_private.insert_event(event);
            if entity_kind is not null then insert into birdnerd_private.entity_reference_index(workspace_id,entity_id,entity_kind,created_event_id) values ((event ->> 'workspace_id')::uuid,entity_id_text::uuid,entity_kind,(event ->> 'event_id')::uuid) on conflict do nothing; end if;
            result := jsonb_build_object('kind','accepted','event_id',event ->> 'event_id','server_sequence',sequence);
          end if;
        end if;
      end if;
    end if;
    insert into birdnerd_private.event_receipts(auth_user_id,event_id,receipt) values(caller_id,coalesce(event ->> 'event_id','<missing>'),result) on conflict(auth_user_id,event_id) do update set receipt=excluded.receipt, recorded_at=clock_timestamp();
    receipt := result; return next;
  end loop;
end $$;
