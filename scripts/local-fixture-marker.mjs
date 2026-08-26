/**
 * Records that the Loader completed this exact disposable fixture. The marker
 * is local runtime state, not a production migration or public data contract.
 */
export async function markLoadedLocalFixture(database, fixture, workspaceId) {
  await database.query(`
    create table if not exists birdnerd_private.local_fixture_marker (
      singleton boolean primary key default true check (singleton),
      fixture_name text not null,
      fixture_version integer not null,
      workspace_id uuid not null
    );
    revoke all on table birdnerd_private.local_fixture_marker from public, anon, authenticated;
  `)
  await database.query(
    `insert into birdnerd_private.local_fixture_marker (singleton, fixture_name, fixture_version, workspace_id)
     values (true, $1, $2, $3::uuid)
     on conflict (singleton) do update set
       fixture_name = excluded.fixture_name,
       fixture_version = excluded.fixture_version,
       workspace_id = excluded.workspace_id`,
    [fixture.fixture, fixture.version, workspaceId],
  )
}

/** Returns true only after this fixture's Loader replay completed and marked it. */
export async function isMarkedLocalFixture(database, fixture, workspaceId) {
  const table = await database.query("select to_regclass('birdnerd_private.local_fixture_marker') as marker_table")
  if (table.rows[0]?.marker_table !== 'birdnerd_private.local_fixture_marker') return false
  const result = await database.query(
    `select exists (
       select 1 from birdnerd_private.local_fixture_marker
       where singleton
         and fixture_name = $2
         and fixture_version = $3
         and workspace_id = $1::uuid
     ) as fixture_workspace`,
    [workspaceId, fixture.fixture, fixture.version],
  )
  return result.rows[0]?.fixture_workspace === true
}
