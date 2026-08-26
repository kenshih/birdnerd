import assert from 'node:assert/strict'
import test from 'node:test'
import { authorizeLocalFixtureEmailBootstrap, clearLocalFixtureEmailBootstrap, installLocalEmailSignupGuard } from './local-auth-hook.mjs'

test('installs the email-registration guard only through an existing verified local database connection', async () => {
  const statements = []
  await installLocalEmailSignupGuard({ query: async statement => { statements.push(statement) } })

  assert.equal(statements.length, 1)
  assert.match(statements[0], /create or replace function birdnerd_private\.birdnerd_reject_email_signup/u)
  assert.match(statements[0], /create table if not exists birdnerd_private\.local_fixture_email_bootstrap/u)
  assert.match(statements[0], /delete from birdnerd_private\.local_fixture_email_bootstrap/u)
  assert.match(statements[0], /provider' = 'email'/u)
  assert.match(statements[0], /grant select, delete on table birdnerd_private\.local_fixture_email_bootstrap to supabase_auth_admin/u)
  assert.match(statements[0], /grant execute on function birdnerd_private\.birdnerd_reject_email_signup\(jsonb\) to supabase_auth_admin/u)
  assert.match(statements[0], /revoke all on function birdnerd_private\.birdnerd_reject_email_signup\(jsonb\) from public, anon, authenticated/u)
})

test('authorizes only declared fixture emails once and clears unused authorizations', async () => {
  const queries = []
  const database = { query: async (text, values) => { queries.push([text, values]) } }
  const members = [{ email: 'Fixture-Admin@BirdNerd.Test' }, { email: 'fixture-contributor@birdnerd.test' }]

  await authorizeLocalFixtureEmailBootstrap(database, members)
  await clearLocalFixtureEmailBootstrap(database, members)

  assert.match(queries[0][0], /insert into birdnerd_private\.local_fixture_email_bootstrap/u)
  assert.deepEqual(queries[0][1], [['Fixture-Admin@BirdNerd.Test', 'fixture-contributor@birdnerd.test']])
  assert.match(queries[1][0], /delete from birdnerd_private\.local_fixture_email_bootstrap/u)
  assert.deepEqual(queries[1][1], [['fixture-admin@birdnerd.test', 'fixture-contributor@birdnerd.test']])
})
