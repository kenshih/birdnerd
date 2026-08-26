import { describe, expect, it } from 'vitest'
import { selectFieldAuthAdapter } from './fieldAuth'

const profiles = JSON.stringify([
  { id: 'fixture-admin', label: 'Continue as Fixture Admin', email: 'fixture-admin@birdnerd.test', password: 'fixture-admin-local-only' },
  { id: 'fixture-contributor', label: 'Continue as Fixture Contributor', email: 'fixture-contributor@birdnerd.test', password: 'fixture-contributor-local-only' },
])

describe('Field Auth adapter selection', () => {
  it('selects fixture Auth only for the launcher-marked loopback development target', () => {
    expect(selectFieldAuthAdapter({
      DEV: true,
      VITE_FIELD_DEVELOPMENT_TARGET: 'local',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_LOCAL_FIXTURE_AUTH_PROFILES: profiles,
    })).toMatchObject({ kind: 'local-fixture' })
  })

  it('keeps pilot and production Google-only even if local fixture values are ambient', () => {
    expect(selectFieldAuthAdapter({
      DEV: true,
      VITE_FIELD_DEVELOPMENT_TARGET: 'pilot',
      VITE_SUPABASE_URL: 'https://pilot.supabase.co',
      VITE_LOCAL_FIXTURE_AUTH_PROFILES: profiles,
    })).toEqual({ kind: 'google' })
    expect(selectFieldAuthAdapter({
      DEV: false,
      VITE_FIELD_DEVELOPMENT_TARGET: 'local',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_LOCAL_FIXTURE_AUTH_PROFILES: profiles,
    })).toEqual({ kind: 'google' })
  })

  it('uses the existing Google adapter only for a launcher-marked loopback local Google target', () => {
    expect(selectFieldAuthAdapter({
      DEV: true,
      VITE_FIELD_DEVELOPMENT_TARGET: 'local-google',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_LOCAL_FIXTURE_AUTH_PROFILES: profiles,
    })).toEqual({ kind: 'google' })
    expect(selectFieldAuthAdapter({
      DEV: true,
      VITE_FIELD_DEVELOPMENT_TARGET: 'local-google',
      VITE_SUPABASE_URL: 'https://pilot.supabase.co',
    })).toMatchObject({ kind: 'local-unavailable' })
  })

  it('refuses a launcher-marked local target when its Supabase URL is not loopback', () => {
    expect(selectFieldAuthAdapter({
      DEV: true,
      VITE_FIELD_DEVELOPMENT_TARGET: 'local',
      VITE_SUPABASE_URL: 'https://pilot.supabase.co',
      VITE_LOCAL_FIXTURE_AUTH_PROFILES: profiles,
    })).toMatchObject({ kind: 'local-unavailable' })
  })
})
