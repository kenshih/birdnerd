begin;
select plan(33);

select has_table('birdnerd_private', 'event_log', 'private Event Log exists');
select has_table('birdnerd_private', 'membership_index', 'derived Membership index exists');
select has_index('birdnerd_private', 'event_log', 'event_log_workspace_sequence_idx', 'Workspace sequence pull index exists');
select has_index('birdnerd_private', 'membership_index', 'membership_index_auth_user_idx', 'active-principal Membership lookup index exists');
select ok((select relrowsecurity from pg_class where oid = 'birdnerd_private.event_log'::regclass), 'Event Log uses RLS defense in depth');
select ok((select relrowsecurity from pg_class where oid = 'birdnerd_private.membership_index'::regclass), 'Membership index uses RLS defense in depth');
select function_privs_are('public', 'birdnerd_claim_initial_access', array[]::text[], 'anon', array[]::text[], 'anon cannot claim access');
select function_privs_are('public', 'birdnerd_append_events', array['jsonb'], 'anon', array[]::text[], 'anon cannot append');
select function_privs_are('public', 'birdnerd_pull_events', array['uuid','bigint','integer'], 'anon', array[]::text[], 'anon cannot pull');
select ok(has_function_privilege('authenticated', 'public.birdnerd_append_events(jsonb)', 'EXECUTE'), 'authenticated can execute append RPC');
select ok(not has_schema_privilege('authenticated', 'birdnerd_private', 'USAGE'), 'browser role cannot access private schema');

create temp table phase30_fixture as
select
  (receipt ->> 'workspace_id')::uuid as workspace_id,
  null::uuid as user_account_id
from (
  select birdnerd_private.bootstrap_workspace(
    'Pilot Workspace',
    '[{"email":"admin@example.com","role":"admin"}]'::jsonb,
    'pgtap'
  ) as receipt
) bootstrap;

create temp table phase30_other_fixture as
select (receipt ->> 'workspace_id')::uuid as workspace_id
from (
  select birdnerd_private.bootstrap_workspace(
    'Other Workspace',
    '[{"email":"other@example.com","role":"admin"}]'::jsonb,
    'pgtap'
  ) as receipt
) bootstrap;

grant select on phase30_fixture, phase30_other_fixture to authenticated;

select is((select count(*)::integer from phase30_fixture), 1, 'restricted bootstrap returns one audit receipt');
select is((select count(*)::integer from birdnerd_private.event_log), 4, 'two bootstrap operations append canonical Workspace and Membership Events');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
values
  ('10000000-0000-4000-8000-000000000001', 'admin@example.com', '{"provider":"google"}', '{}', false, false),
  ('10000000-0000-4000-8000-000000000002', 'uninvited@example.com', '{"provider":"google"}', '{}', false, false);

insert into auth.identities (provider_id, user_id, identity_data, provider)
values
  ('google-admin', '10000000-0000-4000-8000-000000000001', '{"sub":"google-admin","email":"admin@example.com"}', 'google'),
  ('google-uninvited', '10000000-0000-4000-8000-000000000002', '{"sub":"google-uninvited","email":"uninvited@example.com"}', 'google');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.birdnerd_claim_initial_access()), 4, 'exact-email Google principal claims and receives four access Events');
reset role;

update phase30_fixture fixture set user_account_id = membership.user_account_id
from birdnerd_private.membership_index membership where membership.workspace_id = fixture.workspace_id;
select is((select status from birdnerd_private.membership_index where email = 'admin@example.com'), 'active', 'claim activates the pending Membership');
select is((select auth_user_id from birdnerd_private.membership_index where email = 'admin@example.com'), '10000000-0000-4000-8000-000000000001'::uuid, 'claim derives and stores the authenticated principal');
select is((select count(*)::integer from birdnerd_private.event_log where workspace_id = (select workspace_id from phase30_fixture)), 4, 'claim atomically appends link and activation Events');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.birdnerd_claim_initial_access()), 4, 'repeated claim returns the active Workspace history');
reset role;
select is((select count(*)::integer from birdnerd_private.event_log where workspace_id = (select workspace_id from phase30_fixture)), 4, 'repeated claim is idempotent');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.birdnerd_claim_initial_access()), 0, 'uninvited Google principal receives no Workspace Events');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000100','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_fixture),'command_id','018f8c7b-0000-7000-8000-000000000101','occurred_at','2026-08-13T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase30_fixture)),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000102')
  )))
), 'accepted', 'active Member can append a valid operational Event');

select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000100','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_fixture),'command_id','018f8c7b-0000-7000-8000-000000000101','occurred_at','2026-08-13T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase30_fixture)),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000102')
  )))
), 'duplicate', 'retrying identical immutable content returns duplicate');

select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000109','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_fixture),'command_id','018f8c7b-0000-7000-8000-000000000110','occurred_at','2026-02-30T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase30_fixture)),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000111')
  )))
), 'rejected', 'invalid RFC 3339 calendar dates are permanently rejected');

select is((select receipt ->> 'kind' from public.birdnerd_append_events('[1]'::jsonb)), 'rejected', 'malformed scalar Event input returns a rejection receipt');

select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000103','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_fixture),'command_id','018f8c7b-0000-7000-8000-000000000104','occurred_at','2026-08-13T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',1),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000999'),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000105')
  )))
), 'rejected', 'actor mismatch is permanently rejected');

select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000106','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_other_fixture),'command_id','018f8c7b-0000-7000-8000-000000000107','occurred_at','2026-08-13T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',2),
    'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase30_fixture)),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000108')
  )))
), 'rejected', 'cross-Workspace append is permanently rejected');

select throws_ok(
  format('select * from public.birdnerd_pull_events(%L::uuid, 0, 100)', (select workspace_id from phase30_other_fixture)),
  '42501', 'Active Workspace Membership required.', 'cross-Workspace pull is denied'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
select is((
  select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000100','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
    'workspace_id',(select workspace_id from phase30_fixture),'command_id','018f8c7b-0000-7000-8000-000000000101','occurred_at','2026-08-13T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase30_fixture)),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000102')
  )))
), 'rejected', 'an uninvited principal cannot probe an existing Event ID through duplicate admission');
reset role;

select ok(not has_table_privilege('authenticated', 'birdnerd_private.event_log', 'SELECT'), 'authenticated cannot select the raw Event Log');
select ok(not has_table_privilege('authenticated', 'birdnerd_private.membership_index', 'INSERT'), 'authenticated cannot insert Membership rows');
select ok(not has_table_privilege('birdnerd_provisioner', 'birdnerd_private.event_log', 'INSERT'), 'Provisioner role has no raw Event Log DML');
select ok(has_function_privilege('birdnerd_provisioner', 'birdnerd_private.bootstrap_workspace(text,jsonb,text)', 'EXECUTE'), 'Provisioner role can execute only the bootstrap operation');
select ok(not has_function_privilege('birdnerd_provisioner', 'birdnerd_private.insert_event(jsonb)', 'EXECUTE'), 'Provisioner role cannot execute internal Event insertion directly');

select * from finish();
rollback;
