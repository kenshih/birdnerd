import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseOperationalFixture, resetVerifiedLocalStack, selectedFixtureName } from './fixture-loader.mjs'

const verifiedStatus = [
  'API_URL=http://127.0.0.1:54321',
  'PUBLISHABLE_KEY=sb_publishable_local',
  'SECRET_KEY=sb_secret_local',
  'DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
].join('\n')

test('accepts only the selected fixture name, never a path or arbitrary database command', () => {
  assert.equal(selectedFixtureName(['operational-workspace']), 'operational-workspace')
  assert.throws(() => selectedFixtureName([]), /Usage/u)
  assert.throws(() => selectedFixtureName(['../pilot']), /Usage/u)
  assert.throws(() => selectedFixtureName(['operational-workspace', '--db-url', 'postgresql://remote']), /Usage/u)
})

test('parses the versioned operational declaration with exactly the declared Members and data', () => {
  const fixture = parseOperationalFixture(readFileSync(new URL('../data/fixtures/operational-workspace.yaml', import.meta.url), 'utf8'))
  assert.deepEqual(fixture.members.map(member => [member.key, member.role]), [['admin', 'admin'], ['contributor', 'contributor']])
  assert.deepEqual(fixture.operational.band, { number: '1154-81501', size: '1B', type: 'Standard' })
})

test('rejects an unversioned or generic fixture field before any local stack command', () => {
  assert.throws(() => parseOperationalFixture(`
version: 1
fixture: operational-workspace
workspace: { name: Cedar Creek }
members: []
operational: {}
sql: drop database pilot
`), /unsupported or missing/u)
})

test('rejects malformed synthetic Member emails before Auth bootstrap', () => {
  const source = readFileSync(new URL('../data/fixtures/operational-workspace.yaml', import.meta.url), 'utf8')
  assert.throws(() => parseOperationalFixture(source.replace('fixture-admin@birdnerd.test', 'not-an-email')), /email address/u)
})

test('resets only the CLI-verified loopback target with local migrations and no ambient seed', () => {
  const calls = []
  const run = (arguments_) => {
    calls.push(arguments_)
    return { status: 0, stdout: verifiedStatus }
  }

  assert.deepEqual(resetVerifiedLocalStack(run), {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
    databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    secretKey: 'sb_secret_local',
  })
  assert.deepEqual(calls, [
    ['status', '--output', 'env'],
    ['stop'],
    ['start'],
    ['status', '--output', 'env'],
    ['db', 'reset', '--local', '--no-seed', '--yes'],
    ['status', '--output', 'env'],
  ])
})

test('refuses a non-loopback target before it can reset or write fixture data', () => {
  const calls = []
  const run = (arguments_) => {
    calls.push(arguments_)
    return { status: 0, stdout: verifiedStatus.replace('127.0.0.1', 'pilot.supabase.co') }
  }

  assert.throws(() => resetVerifiedLocalStack(run), /refusing a non-local target/u)
  assert.deepEqual(calls, [['status', '--output', 'env']])
})

test('refuses a non-loopback database URL even when the API endpoint appears local', () => {
  const calls = []
  const run = (arguments_) => {
    calls.push(arguments_)
    return { status: 0, stdout: verifiedStatus.replace('127.0.0.1:54322', 'db.pilot.supabase.co:54322') }
  }

  assert.throws(() => resetVerifiedLocalStack(run), /refusing a non-local target/u)
  assert.deepEqual(calls, [['status', '--output', 'env']])
})
