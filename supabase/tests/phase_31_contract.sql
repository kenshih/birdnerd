begin;
select plan(17);

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

create temp table phase31_fixture as
select (receipt ->> 'workspace_id')::uuid as workspace_id
from (select birdnerd_private.bootstrap_workspace('Phase 31 test Workspace', '[{"email":"phase31-admin@example.com","role":"admin"}]'::jsonb, 'pgtap') as receipt) bootstrap;

select is(
  jsonb_array_length(birdnerd_private.invite_membership((select workspace_id from phase31_fixture), null, 'phase31-member@example.com', 'contributor', 'pgtap') -> 'events'),
  1, 'a first invite appends one immutable Membership Event'
);
select is(
  jsonb_array_length(birdnerd_private.invite_membership((select workspace_id from phase31_fixture), null, 'phase31-member@example.com', 'contributor', 'pgtap') -> 'events'),
  0, 'a repeated invite is an idempotent audit receipt without a duplicate Event'
);
select throws_ok(
  format('select birdnerd_private.set_role_membership(%L::uuid, %L::uuid, %L, %L, %L)', (select workspace_id from phase31_fixture), (select membership_id from birdnerd_private.membership_index where email = 'phase31-admin@example.com'), 'owner', 'pgtap'),
  'P0001', 'set-role requires admin or contributor.', 'invalid Membership roles are rejected by the private boundary'
);

select * from finish();
rollback;
