-- event-contract-sha256: 8e663d38f701262b1eb2faa93d26d4de188654f51921380ea1dd920893e1ffcd
-- Add the optional local agency code used by agency CSV exports. Existing
-- Station Events remain valid: absent codes project and export as blank.
create or replace function birdnerd_private.valid_station_fields(fields jsonb) returns boolean
language sql immutable set search_path='' as $$
  select birdnerd_private.valid_optional_fields(
    fields, array['name','agency_code'], array['name','agency_code'], array[]::text[], array[]::text[], array[]::text[]
  ) and (
    not fields ? 'agency_code'
    or fields -> 'agency_code' = 'null'::jsonb
    or fields ->> 'agency_code' ~ '^[A-Z]{4}$'
  );
$$;
