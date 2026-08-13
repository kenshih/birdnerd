-- event-contract-sha256: f06f5e1657fd7019cad7b1e35a559735a186a0e04fb2cc7e5329ed26fc654fa2
-- Verified by scripts/check-supabase-event-contract.mjs against schemas/workspace.
create extension if not exists pgcrypto;

create schema if not exists birdnerd_private;
revoke all on schema birdnerd_private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'birdnerd_provisioner') then
    create role birdnerd_provisioner nologin noinherit;
  end if;
end
$$;

grant usage on schema birdnerd_private to birdnerd_provisioner;

create table birdnerd_private.event_log (
  server_sequence bigint generated always as identity primary key,
  event_id uuid not null unique,
  workspace_id uuid not null,
  event_json jsonb not null,
  accepted_at timestamptz not null default clock_timestamp(),
  constraint event_log_identity_matches check (event_json ->> 'event_id' = event_id::text),
  constraint event_log_workspace_matches check (event_json ->> 'workspace_id' = workspace_id::text)
);

create index event_log_workspace_sequence_idx
  on birdnerd_private.event_log (workspace_id, server_sequence);

create table birdnerd_private.membership_index (
  membership_id uuid primary key,
  workspace_id uuid not null,
  email text not null,
  role text not null check (role in ('admin', 'contributor')),
  status text not null check (status in ('pending', 'active')),
  user_account_id uuid,
  auth_user_id uuid,
  provider_subject text,
  constraint membership_email_canonical check (email = lower(btrim(email))),
  constraint active_membership_linked check (
    (status = 'pending' and user_account_id is null and auth_user_id is null and provider_subject is null)
    or (status = 'active' and user_account_id is not null and auth_user_id is not null and provider_subject is not null)
  ),
  unique (workspace_id, email)
);

create index membership_index_active_workspace_user_idx
  on birdnerd_private.membership_index (workspace_id, user_account_id)
  where status = 'active';

create index membership_index_pending_email_idx
  on birdnerd_private.membership_index (email)
  where status = 'pending';

create index membership_index_auth_user_idx
  on birdnerd_private.membership_index (auth_user_id)
  where auth_user_id is not null;

create table birdnerd_private.event_receipts (
  auth_user_id uuid not null,
  event_id text not null,
  receipt jsonb not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (auth_user_id, event_id)
);

alter table birdnerd_private.event_log enable row level security;
alter table birdnerd_private.membership_index enable row level security;
alter table birdnerd_private.event_receipts enable row level security;

revoke all on all tables in schema birdnerd_private from public, anon, authenticated, birdnerd_provisioner;
revoke all on all sequences in schema birdnerd_private from public, anon, authenticated, birdnerd_provisioner;

create or replace function birdnerd_private.uuid_v7()
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  milliseconds_hex text;
  random_hex text;
begin
  milliseconds_hex := lpad(to_hex(floor(extract(epoch from clock_timestamp()) * 1000)::bigint), 12, '0');
  random_hex := encode(extensions.gen_random_bytes(10), 'hex');
  return (
    substr(milliseconds_hex, 1, 8) || '-' || substr(milliseconds_hex, 9, 4) || '-7' ||
    substr(random_hex, 1, 3) || '-8' || substr(random_hex, 4, 3) || '-' || substr(random_hex, 7, 12)
  )::uuid;
end
$$;

create or replace function birdnerd_private.has_exact_keys(value jsonb, required_keys text[], optional_keys text[] default '{}')
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and value ?& required_keys
    and not exists (
      select 1 from jsonb_object_keys(
        case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end
      ) as key
      where not (key = any(required_keys || optional_keys))
    );
$$;

create or replace function birdnerd_private.is_rfc3339(value text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  date_parts text[];
begin
  date_parts := regexp_match(
    value,
    '^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$'
  );
  if date_parts is null then return false; end if;
  perform pg_catalog.make_date(date_parts[1]::integer, date_parts[2]::integer, date_parts[3]::integer);
  return date_parts[4]::integer <= 23
    and date_parts[5]::integer <= 59
    and date_parts[6]::integer <= 60
    and coalesce(date_parts[7]::integer, 0) <= 23
    and coalesce(date_parts[8]::integer, 0) <= 59;
exception when others then
  return false;
end
$$;

create or replace function birdnerd_private.is_uuid_v7(value text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

create or replace function birdnerd_private.is_safe_nonnegative_integer(value jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_typeof(value) = 'number'
    and value::text ~ '^[0-9]+$'
    and (value::text)::numeric <= 9007199254740991;
$$;

create or replace function birdnerd_private.optional_strings(value jsonb, keys text[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select not exists (
    select 1 from unnest(keys) as key
    where value ? key and jsonb_typeof(value -> key) <> 'string'
  );
$$;

create or replace function birdnerd_private.validate_event(event jsonb)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  event_type text := event ->> 'event_type';
  actor jsonb := event -> 'actor';
  payload jsonb := event -> 'payload';
  fields jsonb;
begin
  if not birdnerd_private.has_exact_keys(
    event,
    array['event_id','event_type','event_schema_version','event_envelope_version','workspace_id','command_id','occurred_at','hlc','actor','payload']
  ) then return 'Event envelope fields are invalid.'; end if;
  if not birdnerd_private.is_uuid_v7(event ->> 'event_id')
    or not birdnerd_private.is_uuid_v7(event ->> 'workspace_id')
    or not birdnerd_private.is_uuid_v7(event ->> 'command_id') then return 'Event identifiers must be canonical UUIDv7 values.'; end if;
  if event -> 'event_schema_version' <> '1'::jsonb or event -> 'event_envelope_version' <> '2'::jsonb then
    return 'Event schema or envelope version is unsupported.';
  end if;
  if not birdnerd_private.is_rfc3339(event ->> 'occurred_at') then
    return 'occurred_at must be RFC 3339 text.';
  end if;
  if not birdnerd_private.has_exact_keys(event -> 'hlc', array['physical_ms','logical'])
    or not birdnerd_private.is_safe_nonnegative_integer(event -> 'hlc' -> 'physical_ms')
    or not birdnerd_private.is_safe_nonnegative_integer(event -> 'hlc' -> 'logical') then return 'HLC values are invalid.'; end if;
  if jsonb_typeof(actor) <> 'object' or jsonb_typeof(payload) <> 'object' then return 'Event actor and payload must be objects.'; end if;

  if actor ->> 'kind' = 'restricted-provisioner' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','provisioner_id'])
      or not birdnerd_private.optional_strings(actor, array['kind','provisioner_id'])
      or coalesce(actor ->> 'provisioner_id', '') = '' then
      return 'Restricted Provisioner actor is invalid.';
    end if;
  elsif actor ->> 'kind' = 'external-identity' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','identity'])
      or not birdnerd_private.has_exact_keys(actor -> 'identity', array['provider','subject','email'])
      or not birdnerd_private.optional_strings(actor -> 'identity', array['provider','subject','email'])
      or actor -> 'identity' ->> 'provider' <> 'google'
      or coalesce(actor -> 'identity' ->> 'subject', '') = ''
      or actor -> 'identity' ->> 'email' <> lower(btrim(actor -> 'identity' ->> 'email')) then
      return 'External identity actor is invalid.';
    end if;
  elsif actor ->> 'kind' = 'user-account' then
    if not birdnerd_private.has_exact_keys(actor, array['kind','user_account_id'])
      or not birdnerd_private.is_uuid_v7(actor ->> 'user_account_id') then return 'User Account actor is invalid.'; end if;
  else return 'Event actor kind is unsupported.';
  end if;

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
  elsif event_type = 'session.created' then
    if not birdnerd_private.has_exact_keys(payload, array['session_id'], array['session_date','location_name','protocol','notes'])
      or not birdnerd_private.optional_strings(payload, array['session_id','session_date','location_name','protocol','notes'])
      or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') then return 'session.created payload is invalid.'; end if;
  elsif event_type = 'banding-record.created' then
    if not birdnerd_private.has_exact_keys(payload, array['record_id','session_id'], array['band_number','species_code','age','sex','capture_time','notes'])
      or not birdnerd_private.optional_strings(payload, array['record_id','session_id','band_number','species_code','age','sex','capture_time','notes'])
      or not birdnerd_private.is_uuid_v7(payload ->> 'record_id')
      or not birdnerd_private.is_uuid_v7(payload ->> 'session_id') then return 'banding-record.created payload is invalid.'; end if;
  elsif event_type = 'banding-record.fields-amended' then
    fields := payload -> 'fields';
    if not birdnerd_private.has_exact_keys(payload, array['record_id','fields'])
      or not birdnerd_private.is_uuid_v7(payload ->> 'record_id')
      or not birdnerd_private.has_exact_keys(fields, '{}', array['band_number','species_code','age','sex','capture_time','notes'])
      or not birdnerd_private.optional_strings(fields, array['band_number','species_code','age','sex','capture_time','notes'])
      or fields = '{}'::jsonb then return 'banding-record.fields-amended payload is invalid.'; end if;
  else return 'Event type is unsupported.';
  end if;
  return null;
end
$$;

create or replace function birdnerd_private.insert_event(event jsonb)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into birdnerd_private.event_log (event_id, workspace_id, event_json)
  values ((event ->> 'event_id')::uuid, (event ->> 'workspace_id')::uuid, event)
  on conflict (event_id) do nothing
  returning server_sequence;
$$;

create or replace function birdnerd_private.bootstrap_workspace(
  workspace_name text,
  pending_members jsonb,
  provisioner_id text default 'phase-30-operator'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  workspace_id uuid := birdnerd_private.uuid_v7();
  command_id uuid := birdnerd_private.uuid_v7();
  event_id uuid;
  membership_id uuid;
  member jsonb;
  event jsonb;
  events jsonb := '[]'::jsonb;
  now_text text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  physical_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  logical_counter bigint := 0;
begin
  if nullif(btrim(workspace_name), '') is null or nullif(btrim(provisioner_id), '') is null then raise exception 'Workspace name and Provisioner ID are required.'; end if;
  if jsonb_typeof(pending_members) <> 'array' or jsonb_array_length(pending_members) = 0 then raise exception 'At least one pending Member is required.'; end if;
  if not exists (select 1 from jsonb_array_elements(pending_members) item where item ->> 'role' = 'admin') then raise exception 'At least one Admin is required.'; end if;

  event_id := birdnerd_private.uuid_v7();
  event := jsonb_build_object(
    'event_id', event_id, 'event_type', 'workspace.created', 'event_schema_version', 1, 'event_envelope_version', 2,
    'workspace_id', workspace_id, 'command_id', command_id, 'occurred_at', now_text,
    'hlc', jsonb_build_object('physical_ms', physical_ms, 'logical', logical_counter),
    'actor', jsonb_build_object('kind','restricted-provisioner','provisioner_id',provisioner_id),
    'payload', jsonb_build_object('workspace_id',workspace_id,'name',btrim(workspace_name))
  );
  perform birdnerd_private.insert_event(event);
  events := events || jsonb_build_array(event);

  for member in select value from jsonb_array_elements(pending_members)
  loop
    if not birdnerd_private.has_exact_keys(member, array['email','role'])
      or lower(btrim(member ->> 'email')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or member ->> 'role' not in ('admin','contributor') then raise exception 'Pending Member is invalid.'; end if;
    membership_id := birdnerd_private.uuid_v7();
    logical_counter := logical_counter + 1;
    event_id := birdnerd_private.uuid_v7();
    event := jsonb_build_object(
      'event_id', event_id, 'event_type', 'membership.preauthorized', 'event_schema_version', 1, 'event_envelope_version', 2,
      'workspace_id', workspace_id, 'command_id', command_id, 'occurred_at', now_text,
      'hlc', jsonb_build_object('physical_ms', physical_ms, 'logical', logical_counter),
      'actor', jsonb_build_object('kind','restricted-provisioner','provisioner_id',provisioner_id),
      'payload', jsonb_build_object('membership_id',membership_id,'email',lower(btrim(member ->> 'email')),'role',member ->> 'role')
    );
    if birdnerd_private.validate_event(event) is not null then raise exception '%', birdnerd_private.validate_event(event); end if;
    perform birdnerd_private.insert_event(event);
    insert into birdnerd_private.membership_index (membership_id, workspace_id, email, role, status)
      values (membership_id, workspace_id, lower(btrim(member ->> 'email')), member ->> 'role', 'pending');
    events := events || jsonb_build_array(event);
  end loop;
  return jsonb_build_object('workspace_id',workspace_id,'command_id',command_id,'events',events,'member_count',jsonb_array_length(pending_members));
end
$$;

create or replace function public.birdnerd_claim_initial_access()
returns table (server_sequence bigint, event_json jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  google_subject text;
  membership birdnerd_private.membership_index%rowtype;
  new_user_account_id uuid;
  command_id uuid;
  linked_event jsonb;
  activated_event jsonb;
  now_text text;
  physical_ms bigint;
begin
  if caller_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select lower(btrim(identity_data ->> 'email')), coalesce(identity_data ->> 'sub', provider_id)
    into caller_email, google_subject
    from auth.identities where user_id = caller_id and provider = 'google' order by created_at limit 1;
  if nullif(caller_email, '') is null or nullif(google_subject, '') is null then return; end if;

  select * into membership from birdnerd_private.membership_index
    where auth_user_id = caller_id or (status = 'pending' and email = caller_email)
    order by case when auth_user_id = caller_id then 0 else 1 end
    for update limit 1;
  if not found then return; end if;

  if membership.status = 'pending' then
    new_user_account_id := birdnerd_private.uuid_v7();
    command_id := birdnerd_private.uuid_v7();
    now_text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    physical_ms := floor(extract(epoch from clock_timestamp()) * 1000);
    linked_event := jsonb_build_object(
      'event_id',birdnerd_private.uuid_v7(),'event_type','user-account.linked','event_schema_version',1,'event_envelope_version',2,
      'workspace_id',membership.workspace_id,'command_id',command_id,'occurred_at',now_text,
      'hlc',jsonb_build_object('physical_ms',physical_ms,'logical',0),
      'actor',jsonb_build_object('kind','external-identity','identity',jsonb_build_object('provider','google','subject',google_subject,'email',caller_email)),
      'payload',jsonb_build_object('user_account_id',new_user_account_id,'identity',jsonb_build_object('provider','google','subject',google_subject,'email',caller_email))
    );
    activated_event := jsonb_build_object(
      'event_id',birdnerd_private.uuid_v7(),'event_type','membership.activated','event_schema_version',1,'event_envelope_version',2,
      'workspace_id',membership.workspace_id,'command_id',command_id,'occurred_at',now_text,
      'hlc',jsonb_build_object('physical_ms',physical_ms,'logical',1),
      'actor',linked_event -> 'actor',
      'payload',jsonb_build_object('membership_id',membership.membership_id,'user_account_id',new_user_account_id)
    );
    if birdnerd_private.validate_event(linked_event) is not null or birdnerd_private.validate_event(activated_event) is not null then raise exception 'Initial-access Event construction failed.'; end if;
    perform birdnerd_private.insert_event(linked_event);
    perform birdnerd_private.insert_event(activated_event);
    update birdnerd_private.membership_index set status='active', user_account_id=new_user_account_id,
      auth_user_id=caller_id, provider_subject=google_subject where membership_id=membership.membership_id;
  end if;

  return query select log.server_sequence, log.event_json from birdnerd_private.event_log log
    where log.workspace_id = membership.workspace_id order by log.server_sequence;
end
$$;

create or replace function public.birdnerd_append_events(events jsonb)
returns table (receipt jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  event jsonb;
  existing birdnerd_private.event_log%rowtype;
  membership birdnerd_private.membership_index%rowtype;
  validation_error text;
  result jsonb;
  sequence bigint;
begin
  if caller_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 100 then raise exception 'Events must be an array of at most 100 items.'; end if;
  for event in select value from jsonb_array_elements(events)
  loop
    validation_error := birdnerd_private.validate_event(event);
    if validation_error is not null or event ->> 'event_type' not in ('session.created','banding-record.created','banding-record.fields-amended') then
      result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason',coalesce(validation_error,'Event type is not accepted from Field.'),'permanent',true);
    else
      select * into membership from birdnerd_private.membership_index
        where workspace_id = (event ->> 'workspace_id')::uuid and auth_user_id = caller_id and status = 'active';
      if not found or event -> 'actor' ->> 'kind' <> 'user-account' or event -> 'actor' ->> 'user_account_id' <> membership.user_account_id::text then
        result := jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Actor is not an active Member of the target Workspace.','permanent',true);
      else
        select * into existing from birdnerd_private.event_log where event_id = (event ->> 'event_id')::uuid;
        if found then
          result := case when existing.event_json = event
            then jsonb_build_object('kind','duplicate','event_id',event ->> 'event_id','server_sequence',existing.server_sequence)
            else jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Event ID conflicts with immutable content.','permanent',true) end;
        else
          sequence := birdnerd_private.insert_event(event);
          if sequence is not null then
            result := jsonb_build_object('kind','accepted','event_id',event ->> 'event_id','server_sequence',sequence);
          else
            select * into existing from birdnerd_private.event_log where event_id = (event ->> 'event_id')::uuid;
            result := case when existing.event_json = event
              then jsonb_build_object('kind','duplicate','event_id',event ->> 'event_id','server_sequence',existing.server_sequence)
              else jsonb_build_object('kind','rejected','event_id',event ->> 'event_id','reason','Event ID conflicts with immutable content.','permanent',true) end;
          end if;
        end if;
      end if;
    end if;
    insert into birdnerd_private.event_receipts (auth_user_id,event_id,receipt)
      values (caller_id,coalesce(event ->> 'event_id','<missing>'),result)
      on conflict (auth_user_id,event_id) do update set receipt=excluded.receipt, recorded_at=clock_timestamp();
    receipt := result;
    return next;
  end loop;
end
$$;

create or replace function public.birdnerd_pull_events(workspace_id uuid, after_server_sequence bigint default 0, page_size integer default 100)
returns table (server_sequence bigint, event_json jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or page_size < 1 or page_size > 100 then raise exception 'Authorized page request required.' using errcode = '42501'; end if;
  if not exists (select 1 from birdnerd_private.membership_index membership
    where membership.workspace_id = birdnerd_pull_events.workspace_id and membership.auth_user_id = auth.uid() and membership.status = 'active') then
    raise exception 'Active Workspace Membership required.' using errcode = '42501';
  end if;
  return query select log.server_sequence, log.event_json from birdnerd_private.event_log log
    where log.workspace_id = birdnerd_pull_events.workspace_id and log.server_sequence > after_server_sequence
    order by log.server_sequence limit page_size;
end
$$;

revoke execute on all functions in schema birdnerd_private from public, anon, authenticated;
revoke execute on function birdnerd_private.bootstrap_workspace(text,jsonb,text) from public, anon, authenticated;
grant execute on function birdnerd_private.bootstrap_workspace(text,jsonb,text) to birdnerd_provisioner;

revoke execute on function public.birdnerd_claim_initial_access() from public, anon;
revoke execute on function public.birdnerd_append_events(jsonb) from public, anon;
revoke execute on function public.birdnerd_pull_events(uuid,bigint,integer) from public, anon;
grant execute on function public.birdnerd_claim_initial_access() to authenticated;
grant execute on function public.birdnerd_append_events(jsonb) to authenticated;
grant execute on function public.birdnerd_pull_events(uuid,bigint,integer) to authenticated;

comment on function public.birdnerd_claim_initial_access() is 'Atomically links and activates an exact-email pending Workspace Membership for the authenticated Google principal.';
comment on function public.birdnerd_append_events(jsonb) is 'Admits immutable operational Events for an active Workspace Member and returns durable per-Event receipts.';
comment on function public.birdnerd_pull_events(uuid,bigint,integer) is 'Returns an active Member server-sequenced Workspace Event page after a durable client cursor.';
