-- Rebuild only the derived admission aid from immutable Event history. This
-- is deliberately separate from Event decoding: historical Event JSON is
-- never rewritten by a schema migration.
create or replace function birdnerd_private.backfill_entity_reference_index()
returns bigint
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare inserted_count bigint;
begin
  insert into birdnerd_private.entity_reference_index (
    workspace_id, entity_id, entity_kind, created_event_id
  )
  select
    event.workspace_id,
    entity.entity_id_text::uuid,
    entity.entity_kind,
    event.event_id
  from birdnerd_private.event_log as event
  cross join lateral (
    values
      ('station.created', 'station', event.event_json #>> '{payload,station_id}'),
      ('net.created', 'net', event.event_json #>> '{payload,net_id}'),
      ('person.created', 'person', event.event_json #>> '{payload,person_id}'),
      ('bander.created', 'bander', event.event_json #>> '{payload,bander_id}'),
      ('band.received', 'band', event.event_json #>> '{payload,band_id}'),
      ('session.created', 'session', event.event_json #>> '{payload,session_id}'),
      ('banding-record.created', 'banding-record', event.event_json #>> '{payload,record_id}')
  ) as entity(event_type, entity_kind, entity_id_text)
  where event.event_json ->> 'event_type' = entity.event_type
    and entity.entity_id_text is not null
    and birdnerd_private.is_uuid_v7(entity.entity_id_text)
  order by event.server_sequence
  on conflict (entity_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end
$$;

-- The function is an internal migration/test seam, not browser or Provisioner
-- capability. New admissions continue to update the same index transactionally.
revoke all on function birdnerd_private.backfill_entity_reference_index() from public, anon, authenticated, birdnerd_provisioner;

select birdnerd_private.backfill_entity_reference_index();
