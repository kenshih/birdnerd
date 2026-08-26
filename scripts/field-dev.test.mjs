import assert from 'node:assert/strict'
import test from 'node:test'
import { developmentTarget, fieldViteEnvironment, hostedPilotSettings, localFieldSettings, parseEnvVariables, viteModeForTarget } from './field-dev.mjs'
import { localSupabaseEnvironment } from './local-supabase.mjs'

test('parses quoted Supabase status values without evaluating shell content', () => {
  assert.deepEqual(parseEnvVariables('API_URL="http://127.0.0.1:54321"\nPUBLISHABLE_KEY=sb_publishable_local\n'), {
    API_URL: 'http://127.0.0.1:54321',
    PUBLISHABLE_KEY: 'sb_publishable_local',
  })
})

test('accepts a loopback local stack and its current publishable key', () => {
  assert.deepEqual(localFieldSettings('API_URL=http://localhost:54321\nPUBLISHABLE_KEY=sb_publishable_local\n'), {
    url: 'http://localhost:54321',
    publishableKey: 'sb_publishable_local',
  })
})

test('accepts the legacy local anon key while the CLI transitions to publishable keys', () => {
  assert.deepEqual(localFieldSettings('API_URL=http://127.0.0.1:54321\nANON_KEY=eyJ.local.anon\n'), {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'eyJ.local.anon',
  })
})

test('rejects a non-local status endpoint before Vite can receive it', () => {
  assert.throws(
    () => localFieldSettings('API_URL=https://project.supabase.co\nPUBLISHABLE_KEY=sb_publishable_remote\n'),
    /refusing a non-local target/u,
  )
})

test('requires a non-loopback HTTPS target for the explicit hosted pilot command', () => {
  assert.deepEqual(hostedPilotSettings('VITE_SUPABASE_URL=https://project.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_pilot\n'), {
    url: 'https://project.supabase.co',
    publishableKey: 'sb_publishable_pilot',
  })
  assert.throws(
    () => hostedPilotSettings('VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local\n'),
    /must not point at a loopback/u,
  )
})

test('requires the package-script target and rejects an appended target override', () => {
  assert.equal(developmentTarget(['--target=local']), 'local')
  assert.equal(developmentTarget(['--target=local-google']), 'local-google')
  assert.equal(developmentTarget(['--target=pilot']), 'pilot')
  assert.throws(
    () => developmentTarget(['--target=local', '--target=pilot']),
    /Exactly one development target/u,
  )
})

test('uses a Vite mode that does not conflict with the .env.local convention', () => {
  assert.equal(viteModeForTarget('local'), 'field-local')
  assert.equal(viteModeForTarget('local-google'), 'field-local')
  assert.notEqual(viteModeForTarget('local'), 'local')
  assert.equal(viteModeForTarget('pilot'), 'pilot')
})

test('local runtime settings override ambient auth values with the declared fixture profiles', () => {
  const environment = fieldViteEnvironment({
    VITE_E2E_ACCESS: 'true',
    VITE_FIELD_DEVELOPMENT_TARGET: 'pilot',
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: 'ambient-fixture-profiles',
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_remote',
    OTHER_SETTING: 'unchanged',
  }, {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
  }, 'local')

  const { VITE_LOCAL_FIXTURE_AUTH_PROFILES: fixtureProfiles, ...withoutFixtureProfiles } = environment
  assert.deepEqual(withoutFixtureProfiles, {
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
    OTHER_SETTING: 'unchanged',
    VITE_E2E_ACCESS: 'false',
    VITE_FIELD_DEVELOPMENT_TARGET: 'local',
  })
  assert.deepEqual(JSON.parse(fixtureProfiles), [
    {
      id: 'fixture-admin',
      label: 'Continue as Fixture Admin',
      email: 'fixture-admin@birdnerd.test',
      password: 'fixture-admin-local-only',
    },
    {
      id: 'fixture-contributor',
      label: 'Continue as Fixture Contributor',
      email: 'fixture-contributor@birdnerd.test',
      password: 'fixture-contributor-local-only',
    },
  ])
})

test('hosted pilot settings clear ambient local fixture selection', () => {
  const environment = fieldViteEnvironment({
    VITE_FIELD_DEVELOPMENT_TARGET: 'local',
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: 'ambient-fixture-profiles',
  }, {
    url: 'https://project.supabase.co',
    publishableKey: 'sb_publishable_pilot',
  }, 'pilot')

  assert.deepEqual(environment, {
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_pilot',
    VITE_E2E_ACCESS: 'false',
    VITE_FIELD_DEVELOPMENT_TARGET: 'pilot',
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: '',
  })
})

test('local Google settings clear ambient fixture selection while retaining loopback browser settings', () => {
  const environment = fieldViteEnvironment({
    VITE_FIELD_DEVELOPMENT_TARGET: 'local',
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: 'ambient-fixture-profiles',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'ambient-client-id',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: 'ambient-client-secret',
  }, {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
  }, 'local-google')

  assert.deepEqual(environment, {
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
    VITE_E2E_ACCESS: 'false',
    VITE_FIELD_DEVELOPMENT_TARGET: 'local-google',
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: '',
  })
})

test('passes only root .env local Google credentials to the Supabase CLI with local values taking precedence', () => {
  const environment = localSupabaseEnvironment({
    OTHER_SETTING: 'unchanged',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'ambient-client-id',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: 'ambient-client-secret',
  }, [
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=local-client-id',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=local-client-secret',
    'UNRELATED_SECRET=not-passed',
  ].join('\n'))

  assert.deepEqual(environment, {
    OTHER_SETTING: 'unchanged',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'local-client-id',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: 'local-client-secret',
  })
})

test('strips ambient Google credentials and requires both local values for the local Google command', () => {
  const ambient = {
    OTHER_SETTING: 'unchanged',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'ambient-client-id',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: 'ambient-client-secret',
  }
  assert.deepEqual(localSupabaseEnvironment(ambient, ''), { OTHER_SETTING: 'unchanged' })
  assert.throws(
    () => localSupabaseEnvironment(ambient, 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=local-client-id', { requireGoogleOAuth: true }),
    /SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET/u,
  )
})
