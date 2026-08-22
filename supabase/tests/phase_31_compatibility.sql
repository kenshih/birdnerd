begin;
select plan(6);

-- These are actual Phase 30 v1 Event shapes written directly through the
-- pre-index Event Log insert seam. At this point the Phase 31 reference index
-- has no rows for either historical entity.
create temp table phase31_compat_fixture as
select (receipt ->> 'workspace_id')::uuid as workspace_id
from (select birdnerd_private.bootstrap_workspace('Phase 31 compatibility Workspace', '[{"email":"phase31-compat@example.com","role":"admin"}]'::jsonb, 'pgtap') as receipt) bootstrap;
alter table phase31_compat_fixture add column user_account_id uuid;
grant select on phase31_compat_fixture to authenticated;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
values ('10000000-0000-4000-8000-000000000041', 'phase31-compat-account@example.com', '{"provider":"google"}', '{}', false, false);
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('google-phase31-compat', '10000000-0000-4000-8000-000000000041', '{"sub":"google-phase31-compat","email":"phase31-compat@example.com"}', 'google');
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000041';
select is((select count(*)::integer from public.birdnerd_claim_initial_access()), 4, 'fixture Member claims access before historical replay');
reset role;
update phase31_compat_fixture fixture
set user_account_id = membership.user_account_id
from birdnerd_private.membership_index membership
where membership.workspace_id = fixture.workspace_id;

select birdnerd_private.insert_event(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000410','event_type','session.created','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_compat_fixture),'command_id','018f8c7b-0000-7000-8000-000000000411','occurred_at','2026-08-13T12:00:00.000Z',
  'hlc',jsonb_build_object('physical_ms',1786622400000,'logical',0),'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_compat_fixture)),
  'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000412','session_date','2026-08-13')
));
select birdnerd_private.insert_event(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000413','event_type','banding-record.created','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_compat_fixture),'command_id','018f8c7b-0000-7000-8000-000000000414','occurred_at','2026-08-13T12:01:00.000Z',
  'hlc',jsonb_build_object('physical_ms',1786622460000,'logical',0),'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_compat_fixture)),
  'payload',jsonb_build_object('record_id','018f8c7b-0000-7000-8000-000000000415','session_id','018f8c7b-0000-7000-8000-000000000412','species_code','AMRO')
));

select is((select count(*)::integer from birdnerd_private.entity_reference_index where workspace_id = (select workspace_id from phase31_compat_fixture)), 0, 'historical Phase 30 Events predate the reference index');
select is(birdnerd_private.backfill_entity_reference_index(), 2::bigint, 'backfill indexes every applicable historical Phase 30 creation Event');
select is(birdnerd_private.backfill_entity_reference_index(), 0::bigint, 'repeating the backfill is idempotent');
select is((select count(*)::integer from birdnerd_private.event_log where event_id in ('018f8c7b-0000-7000-8000-000000000410'::uuid, '018f8c7b-0000-7000-8000-000000000413'::uuid)), 2, 'backfill does not rewrite or remove historical Events');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000041';
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000416','event_type','banding-record.fields-amended','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_compat_fixture),'command_id','018f8c7b-0000-7000-8000-000000000417','occurred_at','2026-08-13T12:02:00.000Z',
  'hlc',jsonb_build_object('physical_ms',1786622520000,'logical',0),'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_compat_fixture)),
  'payload',jsonb_build_object('record_id','018f8c7b-0000-7000-8000-000000000415','fields',jsonb_build_object('species_code','WIWA'))
)))), 'accepted', 'dependent admission succeeds after the historical record is indexed');
reset role;

select * from finish();
rollback;
