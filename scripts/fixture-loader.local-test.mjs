#!/usr/bin/env node
/**
 * Disposable integration evidence for the fixture loader. It deliberately
 * exercises the same public loader twice against the CLI-local stack and
 * queries the resulting local database only after the loader's authenticated
 * claim, append, receipt, pull-order, and projection assertions have passed.
 */
import assert from 'node:assert/strict'
import { Client } from 'pg'
import { loadFixture, selectedFixtureName } from './fixture-loader.mjs'
import { commandSucceeded, localSupabaseSettings, runLocalSupabase } from './local-supabase.mjs'

const fixture = selectedFixtureName(['operational-workspace'])
const emails = ['fixture-admin@birdnerd.test', 'fixture-contributor@birdnerd.test']
const providerIds = ['fixture-admin', 'fixture-contributor']

try {
  const first = await loadFixture(fixture)
  assert.deepEqual(summary(first), { fixture, event_count: 14, receipt_count: 7 })

  // A second public load resets the same verified loopback target. Its final
  // state is the assertion that no first-run history remains.
  const second = await loadFixture(fixture)
  assert.deepEqual(summary(second), { fixture, event_count: 14, receipt_count: 7 })

  const status = runLocalSupabase(['status', '--output', 'env'], { capture: true })
  if (!commandSucceeded(status)) throw new Error('The local Supabase stack was unavailable after fixture loading.')
  const settings = localSupabaseSettings(status.stdout, { requireDatabase: true })
  const database = new Client({ connectionString: settings.databaseUrl })
  await database.connect()
  try {
    const { rows: [row] } = await database.query(`
      select
        (select count(*)::integer from auth.users where email = any($1::text[])) as auth_users,
        (select count(*)::integer from auth.identities where provider = 'google' and provider_id = any($2::text[])) as google_identities,
        (select count(*)::integer from birdnerd_private.event_log) as events,
        (select count(distinct workspace_id)::integer from birdnerd_private.event_log) as workspaces,
        (select count(*)::integer from birdnerd_private.membership_index where status = 'active') as active_memberships,
        (select count(distinct event_json #>> '{actor,user_account_id}')::integer from birdnerd_private.event_log where event_json #>> '{actor,kind}' = 'user-account') as authenticated_actors,
        (select count(*)::integer from birdnerd_private.event_receipts) as append_receipts
    `, [emails, providerIds])
    assert.deepEqual(row, {
      auth_users: 2,
      google_identities: 2,
      events: 14,
      workspaces: 1,
      active_memberships: 2,
      authenticated_actors: 2,
      append_receipts: 7,
    })
  } finally {
    await database.end()
  }
  console.log('Fixture local integration passed: two public loads left one declared Workspace history with two Auth identities, two active Members, seven receipts, and two authenticated appenders.')
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
}

function summary(receipt) {
  return { fixture: receipt.fixture, event_count: receipt.event_count, receipt_count: receipt.receipt_count }
}
