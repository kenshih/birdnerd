begin;
select plan(31);

select has_table('birdnerd_private', 'entity_reference_index', 'private entity-reference admission index exists');
select ok((select relrowsecurity from pg_class where oid = 'birdnerd_private.entity_reference_index'::regclass), 'entity-reference index uses RLS defense in depth');
select ok(not has_table_privilege('authenticated', 'birdnerd_private.entity_reference_index', 'SELECT'), 'browser role cannot read the entity-reference index');
select ok(not has_table_privilege('birdnerd_provisioner', 'birdnerd_private.entity_reference_index', 'INSERT'), 'Provisioner has no raw entity-index DML');
select ok(has_function_privilege('birdnerd_provisioner', 'birdnerd_private.invite_membership(uuid,uuid,text,text,text)', 'EXECUTE'), 'Provisioner can invite through its narrow function');
select ok(has_function_privilege('birdnerd_provisioner', 'birdnerd_private.set_role_membership(uuid,uuid,text,text,text)', 'EXECUTE'), 'Provisioner can change a role through its narrow function');
select ok(not has_function_privilege('authenticated', 'birdnerd_private.invite_membership(uuid,uuid,text,text,text)', 'EXECUTE'), 'browser role cannot invite Members');

select is(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000201','event_type','session.created','event_schema_version',2,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000203','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000205','fields',jsonb_build_object('session_date','2026-08-21'))
  )), null, 'valid Session v2 envelope is accepted by the structural validator'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000206','event_type','session.created','event_schema_version',2,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000207','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000208')
  )) is not null, 'Session v2 without fields is rejected'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000209','event_type','banding-record.created','event_schema_version',2,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000210','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('record_id','018f8c7b-0000-7000-8000-000000000211','session_id','018f8c7b-0000-7000-8000-000000000205')
  )) is not null, 'Banding Record v2 without fields is rejected'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000212','event_type','unknown.event','event_schema_version',1,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000213','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),'payload','{}'::jsonb
  )) is not null, 'unknown Event types are rejected'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000214','event_type','session.created','event_schema_version',2,'event_envelope_version',1,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000215','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000216','fields','{}'::jsonb)
  )) is not null, 'noncanonical envelope versions are rejected before admission'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000217','event_type','session.created','event_schema_version',2,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000218','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('session_id','018f8c7b-0000-7000-8000-000000000219','fields',jsonb_build_object('unreviewed_field',true))
  )) is not null, 'Session v2 rejects unreviewed form fields'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000220','event_type','banding-record.created','event_schema_version',2,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000221','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('record_id','018f8c7b-0000-7000-8000-000000000222','session_id','018f8c7b-0000-7000-8000-000000000205','fields',jsonb_build_object('band_selection',jsonb_build_object('kind','managed','band_id','not-a-uuid','band_number','1234')))
  )) is not null, 'Banding Record v2 rejects malformed managed selection references'
);

select is(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000223','event_type','band.received','event_schema_version',1,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000224','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('band_id','018f8c7b-0000-7000-8000-000000000225','band_number','1154-81501','fields',jsonb_build_object('band_size','1B','band_type','Standard'))
  )), null, 'Band receipt accepts optional intrinsic size and type metadata'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000260','event_type','band.received','event_schema_version',1,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000261','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('band_id','018f8c7b-0000-7000-8000-000000000262','band_number','1154-81501','fields',jsonb_build_object('band_number','1154-81502'))
  )) is not null, 'Band receipt rejects a nested band_number outside the portable Contract'
);

select is(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000226','event_type','band.fields-amended','event_schema_version',1,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000227','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('band_id','018f8c7b-0000-7000-8000-000000000225','fields',jsonb_build_object('band_size',null,'band_type','Lock-on'))
  )), null, 'Band amendment accepts explicit metadata clears'
);

select ok(
  birdnerd_private.validate_event(jsonb_build_object(
    'event_id','018f8c7b-0000-7000-8000-000000000228','event_type','band.fields-amended','event_schema_version',1,'event_envelope_version',2,
    'workspace_id','018f8c7b-0000-7000-8000-000000000202','command_id','018f8c7b-0000-7000-8000-000000000229','occurred_at','2026-08-21T12:00:00.000Z',
    'hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
    'actor',jsonb_build_object('kind','user-account','user_account_id','018f8c7b-0000-7000-8000-000000000204'),
    'payload',jsonb_build_object('band_id','018f8c7b-0000-7000-8000-000000000225','fields',jsonb_build_object('status','deployed'))
  )) is not null, 'Band amendment rejects mutable status state'
);

create temp table phase31_fixture as
select (receipt ->> 'workspace_id')::uuid as workspace_id
from (select birdnerd_private.bootstrap_workspace('Phase 31 test Workspace', '[{"email":"phase31-admin@example.com","role":"admin"}]'::jsonb, 'pgtap') as receipt) bootstrap;

alter table phase31_fixture add column user_account_id uuid;
grant select on phase31_fixture to authenticated;
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
values ('10000000-0000-4000-8000-000000000031', 'phase31-account@example.com', '{"provider":"google"}', '{}', false, false);
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('google-phase31-admin', '10000000-0000-4000-8000-000000000031', '{"sub":"google-phase31-admin","email":"phase31-admin@example.com"}', 'google');
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000031';
select is((select count(*)::integer from public.birdnerd_claim_initial_access()), 4, 'fixture Admin claims canonical Workspace access');
reset role;
update phase31_fixture fixture set user_account_id = membership.user_account_id from birdnerd_private.membership_index membership where membership.workspace_id = fixture.workspace_id;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000031';
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000231','event_type','station.created','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000232','occurred_at','2026-08-21T12:00:00.000Z','hlc',jsonb_build_object('physical_ms',1787313600000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('station_id','018f8c7b-0000-7000-8000-000000000233','fields',jsonb_build_object('name','North'))
)))), 'accepted', 'browser admission accepts a reviewed Station create field');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000234','event_type','station.fields-amended','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000235','occurred_at','2026-08-21T12:00:01.000Z','hlc',jsonb_build_object('physical_ms',1787313601000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('station_id','018f8c7b-0000-7000-8000-000000000233','fields',jsonb_build_object('name','South'))
)))), 'accepted', 'browser admission accepts a reviewed Station amendment');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000250','event_type','station.fields-amended','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000251','occurred_at','2026-08-21T12:00:01.001Z','hlc',jsonb_build_object('physical_ms',1787313601001,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('station_id','018f8c7b-0000-7000-8000-000000000233','fields',jsonb_build_object('agency_code','GCFS'))
)))), 'accepted', 'browser admission accepts a four-letter Station agency code');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000252','event_type','station.fields-amended','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000253','occurred_at','2026-08-21T12:00:01.002Z','hlc',jsonb_build_object('physical_ms',1787313601002,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('station_id','018f8c7b-0000-7000-8000-000000000233','fields',jsonb_build_object('agency_code','gcfs'))
)))), 'rejected', 'browser admission rejects a noncanonical Station agency code');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000236','event_type','net.created','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000237','occurred_at','2026-08-21T12:00:02.000Z','hlc',jsonb_build_object('physical_ms',1787313602000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('net_id','018f8c7b-0000-7000-8000-000000000238','station_id','018f8c7b-0000-7000-8000-000000000239','fields',jsonb_build_object('label','N1'))
)))), 'deferred', 'unknown structural parent produces a durable deferred receipt');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000240','event_type','band.fields-amended','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000241','occurred_at','2026-08-21T12:00:03.000Z','hlc',jsonb_build_object('physical_ms',1787313603000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('band_id','018f8c7b-0000-7000-8000-000000000233','fields',jsonb_build_object('band_number','1234'))
)))), 'rejected', 'known wrong-kind amendment target is permanently rejected');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000242','event_type','person.created','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000243','occurred_at','2026-08-21T12:00:04.000Z','hlc',jsonb_build_object('physical_ms',1787313604000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('person_id','018f8c7b-0000-7000-8000-000000000244','fields',jsonb_build_object('name','A Bander','initials','AB'))
)))), 'accepted', 'browser admission accepts a reviewed Person create field');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000245','event_type','user-account.person-linked','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000246','occurred_at','2026-08-21T12:00:05.000Z','hlc',jsonb_build_object('physical_ms',1787313605000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('user_account_id',(select user_account_id from phase31_fixture),'person_id','018f8c7b-0000-7000-8000-000000000244')
)))), 'accepted', 'Account link requires and accepts an active target-Workspace Member');
select is((select receipt ->> 'kind' from public.birdnerd_append_events(jsonb_build_array(jsonb_build_object(
  'event_id','018f8c7b-0000-7000-8000-000000000247','event_type','user-account.person-unlinked','event_schema_version',1,'event_envelope_version',2,
  'workspace_id',(select workspace_id from phase31_fixture),'command_id','018f8c7b-0000-7000-8000-000000000248','occurred_at','2026-08-21T12:00:06.000Z','hlc',jsonb_build_object('physical_ms',1787313606000,'logical',0),
  'actor',jsonb_build_object('kind','user-account','user_account_id',(select user_account_id from phase31_fixture)),'payload',jsonb_build_object('user_account_id','018f8c7b-0000-7000-8000-000000000249')
)))), 'rejected', 'phantom Account link targets are permanently rejected');
reset role;

select is(
  jsonb_array_length(birdnerd_private.invite_membership((select workspace_id from phase31_fixture), null, 'phase31-member@example.com', 'contributor', 'pgtap') -> 'events'),
  1, 'a first invite appends one immutable Membership Event'
);
select is(
  jsonb_array_length(birdnerd_private.invite_membership((select workspace_id from phase31_fixture), null, 'phase31-member@example.com', 'contributor', 'pgtap') -> 'events'),
  0, 'a repeated invite is an idempotent audit receipt without a duplicate Event'
);
select throws_ok(
  format('select birdnerd_private.set_role_membership(%L::uuid, %L::uuid, %L, %L, %L)', (select workspace_id from phase31_fixture), (select membership_id from birdnerd_private.membership_index where email = 'phase31-admin@example.com'), null, 'owner', 'pgtap'),
  'P0001', 'set-role requires admin or contributor.', 'invalid Membership roles are rejected by the private boundary'
);

select * from finish();
rollback;
