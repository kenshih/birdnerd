/**
 * Local-only historical migration replay. `supabase test db` mounts SQL test
 * files into its database container but not the checkout's migration tree, so
 * pgTAP cannot \ir the authoritative migration files. This harness reads those
 * exact files from the checkout and executes them in one rollback-only local
 * PostgreSQL transaction: Phase 30 -> historical rows -> Phase 31 -> patch.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Client } = pg
const root = resolve(import.meta.dirname, '..')
const migration = name => readFile(resolve(root, 'supabase', 'migrations', name), 'utf8')
const client = new Client({
  host: process.env.PGHOST ?? '127.0.0.1',
  port: Number(process.env.PGPORT ?? '54322'),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'postgres',
  database: process.env.PGDATABASE ?? 'postgres',
})

const authUserId = '10000000-0000-4000-8000-000000000051'
const sessionId = '018f8c7b-0000-7000-8000-000000000512'
const recordId = '018f8c7b-0000-7000-8000-000000000515'

let begun = false
try {
  await client.connect()
  await client.query('begin')
  begun = true
  await client.query(`
    drop schema if exists birdnerd_private cascade;
    drop function if exists public.birdnerd_claim_initial_access();
    drop function if exists public.birdnerd_append_events(jsonb);
    drop function if exists public.birdnerd_pull_events(uuid, bigint, integer);
  `)

  await client.query(await migration('20260813214141_phase_30_event_exchange.sql'))
  const bootstrap = await client.query(
    "select birdnerd_private.bootstrap_workspace('Phase 31 migration compatibility Workspace', '[{\"email\":\"phase31-migration@example.com\",\"role\":\"admin\"}]'::jsonb, 'migration-replay') as receipt",
  )
  const workspaceId = bootstrap.rows[0]?.receipt?.workspace_id
  if (typeof workspaceId !== 'string') throw new Error('Phase 30 bootstrap did not return a Workspace ID.')

  await client.query(
    "insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous) values ($1, 'phase31-migration-account@example.com', '{\"provider\":\"google\"}', '{}', false, false)",
    [authUserId],
  )
  await client.query(
    "insert into auth.identities (provider_id, user_id, identity_data, provider) values ('google-phase31-migration', $1, '{\"sub\":\"google-phase31-migration\",\"email\":\"phase31-migration@example.com\"}', 'google')",
    [authUserId],
  )
  await client.query('set local role authenticated')
  await client.query(`set local "request.jwt.claim.sub" = '${authUserId}'`)
  const claimed = await client.query('select * from public.birdnerd_claim_initial_access()')
  if (claimed.rowCount !== 4) throw new Error(`Phase 30 initial access returned ${claimed.rowCount} Events instead of 4.`)
  await client.query('reset role')
  const member = await client.query('select user_account_id from birdnerd_private.membership_index where workspace_id = $1', [workspaceId])
  const userAccountId = member.rows[0]?.user_account_id
  if (typeof userAccountId !== 'string') throw new Error('Phase 30 initial access did not activate the fixture Member.')

  await insertHistoricalEvent({
    event_id: '018f8c7b-0000-7000-8000-000000000510', event_type: 'session.created', event_schema_version: 1,
    event_envelope_version: 2, workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000511', occurred_at: '2026-08-13T12:00:00.000Z',
    hlc: { physical_ms: 1786622400000, logical: 0 }, actor: { kind: 'user-account', user_account_id: userAccountId },
    payload: { session_id: sessionId, session_date: '2026-08-13' },
  })
  await insertHistoricalEvent({
    event_id: '018f8c7b-0000-7000-8000-000000000513', event_type: 'banding-record.created', event_schema_version: 1,
    event_envelope_version: 2, workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000514', occurred_at: '2026-08-13T12:01:00.000Z',
    hlc: { physical_ms: 1786622460000, logical: 0 }, actor: { kind: 'user-account', user_account_id: userAccountId },
    payload: { record_id: recordId, session_id: sessionId, species_code: 'AMRO' },
  })

  await client.query(await migration('20260821013452_phase_31_operational_catalog.sql'))
  await expectScalar(
    'select count(*)::integer from birdnerd_private.entity_reference_index where workspace_id = $1',
    [workspaceId],
    0,
    'Phase 31 index creation unexpectedly backfilled historical Events',
  )

  await client.query(await migration('20260822003232_phase_31_event_reference_index_backfill.sql'))
  await expectScalar(
    'select count(*)::integer from birdnerd_private.entity_reference_index where workspace_id = $1',
    [workspaceId],
    2,
    'Actual patch migration did not backfill every historical creation Event',
  )
  await expectScalar(
    'select birdnerd_private.backfill_entity_reference_index()',
    [],
    '0',
    'Backfill was not idempotent after patch-migration application',
  )
  await expectScalar(
    "select event_json ->> 'event_schema_version' from birdnerd_private.event_log where event_id = '018f8c7b-0000-7000-8000-000000000513'::uuid",
    [],
    '1',
    'Patch migration rewrote historical Event JSON',
  )

  await client.query('set local role authenticated')
  await client.query(`set local "request.jwt.claim.sub" = '${authUserId}'`)
  const appended = await client.query(
    'select receipt from public.birdnerd_append_events($1::jsonb)',
    [JSON.stringify([{
      event_id: '018f8c7b-0000-7000-8000-000000000516', event_type: 'banding-record.fields-amended', event_schema_version: 1,
      event_envelope_version: 2, workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000517', occurred_at: '2026-08-13T12:02:00.000Z',
      hlc: { physical_ms: 1786622520000, logical: 0 }, actor: { kind: 'user-account', user_account_id: userAccountId },
      payload: { record_id: recordId, fields: { species_code: 'WIWA' } },
    }])],
  )
  if (appended.rows[0]?.receipt?.kind !== 'accepted') throw new Error('Dependent append was not admitted after patch-migration backfill.')

  console.log('Phase 31 local migration replay passed: Phase 30 history -> Phase 31 index -> patch backfill -> dependent append.')
} finally {
  if (begun) await client.query('rollback')
  await client.end()
}

async function insertHistoricalEvent(event) {
  await client.query('select birdnerd_private.insert_event($1::jsonb)', [JSON.stringify(event)])
}

async function expectScalar(query, values, expected, message) {
  const result = await client.query(query, values)
  const actual = result.rows[0] && Object.values(result.rows[0])[0]
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}.`)
}
