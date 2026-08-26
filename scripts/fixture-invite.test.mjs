import assert from 'node:assert/strict'
import test from 'node:test'
import { inviteFixtureMember, parseFixtureInviteOptions, verifiedLocalFixtureSettings } from './fixture-invite.mjs'
import { withLocalFixtureProvisioner } from './local-fixture-provisioner.mjs'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const status = [
  'API_URL=http://127.0.0.1:54321',
  'PUBLISHABLE_KEY=sb_publishable_local',
  'DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
].join('\n')

test('accepts only one complete explicit local fixture invite', () => {
  assert.deepEqual(parseFixtureInviteOptions([
    '--workspace-id', workspaceId,
    '--email', 'Ken.Shih@Gmail.com',
    '--role', 'admin',
  ]), { workspace_id: workspaceId, email: 'ken.shih@gmail.com', role: 'admin' })
  assert.throws(() => parseFixtureInviteOptions(['--workspace-id', workspaceId, '--email', 'person@example.com', '--role', 'viewer']), /Usage/u)
  assert.throws(() => parseFixtureInviteOptions(['--workspace-id', workspaceId, '--email', 'person@example.com', '--role', 'admin', '--db-url', 'postgresql://remote']), /Usage/u)
  assert.throws(() => parseFixtureInviteOptions(['--workspace-id', workspaceId, '--email', 'person@example.com', '--email', 'other@example.com', '--role', 'admin']), /Usage/u)
})

test('refuses a non-local stack before starting or connecting to a fixture database', () => {
  const calls = []
  assert.throws(
    () => verifiedLocalFixtureSettings(arguments_ => {
      calls.push(arguments_)
      return { status: 0, stdout: status.replace('127.0.0.1', 'pilot.supabase.co') }
    }),
    /refusing a non-local target/u,
  )
  assert.deepEqual(calls, [['status', '--output', 'env']])
})

test('uses only a restricted local Provisioner invite for the declared fixture Workspace', async () => {
  const clients = []
  class Client {
    constructor({ connectionString }) {
      this.connectionString = connectionString
      this.queries = []
      clients.push(this)
    }

    async connect() {}
    async end() {}
    async query(text, values = []) {
      this.queries.push([text, values])
      if (text.includes('to_regclass')) return { rows: [{ marker_table: 'birdnerd_private.local_fixture_marker' }] }
      if (text.includes('select exists')) return { rows: [{ fixture_workspace: true }] }
      return { rows: [] }
    }
  }
  const receipt = { workspace_id: workspaceId, membership_id: '018f8c7b-0000-7000-8000-000000000002', command_id: '018f8c7b-0000-7000-8000-000000000003', events: [] }
  const changeMembership = async (database, operation, input) => {
    assert.match(database.connectionString, /^postgresql:\/\/birdnerd_fixture_provisioner:/u)
    assert.equal(operation, 'invite')
    assert.deepEqual(input, { workspace_id: workspaceId, email: 'ken.shih@gmail.com', role: 'admin', provisioner_id: 'local-fixture-invite' })
    return receipt
  }

  await assert.doesNotReject(async () => {
    const result = await inviteFixtureMember(
      { workspace_id: workspaceId, email: 'ken.shih@gmail.com', role: 'admin' },
      {
        runSupabase: () => ({ status: 0, stdout: status }),
        runtime: { Client, changeMembership },
      },
    )
    assert.deepEqual(result, receipt)
  })

  const primary = clients.find(client => client.connectionString.includes('postgres:postgres@127.0.0.1'))
  assert.ok(primary)
  const fixtureQuery = primary.queries.find(([text]) => text.includes('select exists'))
  assert.ok(fixtureQuery)
  assert.match(fixtureQuery[0], /from birdnerd_private\.local_fixture_marker/u)
  assert.deepEqual(fixtureQuery[1], [workspaceId, 'operational-workspace', 1])
  assert.ok(primary.queries.some(([text]) => text.startsWith('create role birdnerd_fixture_provisioner login nosuperuser nocreatedb nocreaterole noreplication inherit password')))
  assert.ok(primary.queries.some(([text]) => text === 'grant birdnerd_provisioner to birdnerd_fixture_provisioner'))
})

test('does not create a local Provisioner login for a same-named but unmarked Workspace', async () => {
  const queries = []
  class Client {
    async connect() {}
    async end() {}
    async query(text) {
      queries.push(text)
      if (text.includes('to_regclass')) return { rows: [{ marker_table: 'birdnerd_private.local_fixture_marker' }] }
      return { rows: [{ fixture_workspace: false }] }
    }
  }

  await assert.rejects(
    inviteFixtureMember(
      { workspace_id: workspaceId, email: 'ken.shih@gmail.com', role: 'contributor' },
      {
        runSupabase: () => ({ status: 0, stdout: status }),
        runtime: { Client, changeMembership: async () => { throw new Error('must not invite') } },
      },
    ),
    /not the current operational fixture/u,
  )
  assert.ok(queries.some(query => query.includes('from birdnerd_private.local_fixture_marker')))
  assert.ok(!queries.some(query => query.startsWith('create role')))
})

test('rotates an existing restricted Provisioner password without altering its attributes', async () => {
  const queries = []
  const database = {
    async query(text, values = []) {
      queries.push([text, values])
      if (text.startsWith('create role')) {
        const error = new Error('already exists')
        error.code = '42710'
        throw error
      }
      if (text.includes('from pg_roles')) {
        return { rows: [{ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, rolcanlogin: true, rolinherit: true }] }
      }
      return { rows: [] }
    },
  }
  class Client {
    constructor({ connectionString }) { this.connectionString = connectionString }
    async connect() {}
    async end() {}
  }

  await withLocalFixtureProvisioner({
    Client,
    databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    database,
    operation: async () => undefined,
  })

  const rotation = queries.find(([text]) => text.startsWith('alter role birdnerd_fixture_provisioner password'))
  assert.ok(rotation)
  assert.ok(!rotation[0].includes('noreplication'))
})

test('refuses an existing Provisioner login with an unexpected inherited role', async () => {
  const queries = []
  const database = {
    async query(text, values = []) {
      queries.push([text, values])
      if (text.startsWith('create role')) {
        const error = new Error('already exists')
        error.code = '42710'
        throw error
      }
      if (text.includes('from pg_roles')) {
        return { rows: [{ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, rolcanlogin: true, rolinherit: true }] }
      }
      if (text.includes('from pg_auth_members')) return { rows: [{ rolname: 'pg_read_all_data' }] }
      return { rows: [] }
    },
  }
  class Client {
    async connect() { throw new Error('must not connect') }
    async end() {}
  }

  await assert.rejects(
    withLocalFixtureProvisioner({
      Client,
      databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      database,
      operation: async () => undefined,
    }),
    /unexpected privileges/u,
  )
  assert.ok(queries.some(([text]) => text.includes('from pg_auth_members')))
  assert.ok(!queries.some(([text]) => text.startsWith('alter role')))
  assert.ok(!queries.some(([text]) => text.startsWith('grant birdnerd_provisioner')))
})

test('refuses an existing Provisioner login with BYPASSRLS', async () => {
  const queries = []
  const database = {
    async query(text, values = []) {
      queries.push([text, values])
      if (text.startsWith('create role')) {
        const error = new Error('already exists')
        error.code = '42710'
        throw error
      }
      if (text.includes('from pg_roles')) {
        return { rows: [{ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: true, rolcanlogin: true, rolinherit: true }] }
      }
      return { rows: [] }
    },
  }
  class Client {
    async connect() { throw new Error('must not connect') }
    async end() {}
  }

  await assert.rejects(
    withLocalFixtureProvisioner({
      Client,
      databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      database,
      operation: async () => undefined,
    }),
    /not restricted/u,
  )
  assert.ok(!queries.some(([text]) => text.includes('from pg_auth_members')))
  assert.ok(!queries.some(([text]) => text.startsWith('alter role')))
})
