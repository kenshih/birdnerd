import assert from 'node:assert/strict'
import test from 'node:test'
import { isMarkedLocalFixture, markLoadedLocalFixture } from './local-fixture-marker.mjs'

const fixture = { fixture: 'operational-workspace', version: 1 }
const workspaceId = '018f8c7b-0000-7000-8000-000000000001'

test('records only a completed declared fixture marker in the private schema', async () => {
  const queries = []
  const database = { query: async (text, values) => { queries.push([text, values]) } }

  await markLoadedLocalFixture(database, fixture, workspaceId)

  assert.match(queries[0][0], /create table if not exists birdnerd_private\.local_fixture_marker/u)
  assert.match(queries[0][0], /revoke all on table birdnerd_private\.local_fixture_marker from public, anon, authenticated/u)
  assert.match(queries[1][0], /insert into birdnerd_private\.local_fixture_marker/u)
  assert.deepEqual(queries[1][1], ['operational-workspace', 1, workspaceId])
})

test('matches only the marked fixture name, version, and Workspace', async () => {
  const queries = []
  const database = {
    query: async (text, values) => {
      queries.push([text, values])
      if (text.includes('to_regclass')) return { rows: [{ marker_table: 'birdnerd_private.local_fixture_marker' }] }
      return { rows: [{ fixture_workspace: true }] }
    },
  }

  assert.equal(await isMarkedLocalFixture(database, fixture, workspaceId), true)
  assert.deepEqual(queries[1][1], [workspaceId, 'operational-workspace', 1])
})

test('refuses a same-named Workspace without the Loader marker', async () => {
  const database = {
    query: async text => text.includes('to_regclass')
      ? { rows: [{ marker_table: 'birdnerd_private.local_fixture_marker' }] }
      : { rows: [{ fixture_workspace: false }] },
  }

  assert.equal(await isMarkedLocalFixture(database, fixture, workspaceId), false)
})
