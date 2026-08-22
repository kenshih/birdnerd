import assert from 'node:assert/strict'
import test from 'node:test'
import { developmentTarget, fieldViteEnvironment, hostedPilotSettings, localFieldSettings, parseEnvVariables } from './field-dev.mjs'

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
  assert.equal(developmentTarget(['--target=pilot']), 'pilot')
  assert.throws(
    () => developmentTarget(['--target=local', '--target=pilot']),
    /Exactly one development target/u,
  )
})

test('local runtime settings override an inherited hosted setting and clear the E2E fixture flag', () => {
  const environment = fieldViteEnvironment({
    VITE_E2E_ACCESS: 'true',
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_remote',
    OTHER_SETTING: 'unchanged',
  }, {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
  })

  assert.deepEqual(environment, {
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
    OTHER_SETTING: 'unchanged',
    VITE_E2E_ACCESS: 'false',
  })
})
