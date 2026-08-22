import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createLocalFixtureAuthModule, isLoopbackSupabaseUrl, parseLocalFixtureProfiles } from './localFixtureAuth'

const profiles = parseLocalFixtureProfiles(JSON.stringify([
  { id: 'fixture-admin', label: 'Continue as Fixture Admin', email: 'fixture-admin@birdnerd.test', password: 'fixture-admin-local-only' },
  { id: 'fixture-contributor', label: 'Continue as Fixture Contributor', email: 'fixture-contributor@birdnerd.test', password: 'fixture-contributor-local-only' },
]))

const fixtureSession = {
  user: {
    id: 'local-email-user-id',
    email: 'fixture-contributor@birdnerd.test',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    identities: [{ provider: 'google', identity_data: { sub: 'fixture-contributor' } }],
  },
} as unknown as Session

function makePort(initialSession: Session | null = null) {
  let listener: ((event: AuthChangeEvent, nextSession: Session | null) => void) | undefined
  const port = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation(nextListener => {
        listener = nextListener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  return { port, emit: (event: AuthChangeEvent, nextSession: Session | null) => listener?.(event, nextSession) }
}

describe('local fixture Auth adapter', () => {
  it('accepts only the two declared labelled fixture profiles', () => {
    expect(profiles.map(profile => [profile.id, profile.label])).toEqual([
      ['fixture-admin', 'Continue as Fixture Admin'],
      ['fixture-contributor', 'Continue as Fixture Contributor'],
    ])
    expect(() => parseLocalFixtureProfiles(JSON.stringify([
      { id: 'fixture-admin', label: 'Admin', email: 'fixture-admin@birdnerd.test', password: 'password' },
      { id: 'fixture-contributor', label: 'Continue as Fixture Contributor', email: 'fixture-contributor@birdnerd.test', password: 'password' },
    ]))).toThrow(/label/u)
  })

  it('uses the selected known profile for a real password session and maps its synthetic Google identity', async () => {
    const { port, emit } = makePort()
    const auth = createLocalFixtureAuthModule(port, profiles)

    await expect(auth.getState()).resolves.toEqual({
      kind: 'signed-out',
      signInActions: [
        { id: 'fixture-admin', label: 'Continue as Fixture Admin' },
        { id: 'fixture-contributor', label: 'Continue as Fixture Contributor' },
      ],
    })
    await auth.beginSignIn('fixture-contributor')
    expect(port.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'fixture-contributor@birdnerd.test',
      password: 'fixture-contributor-local-only',
    })

    emit('SIGNED_IN', fixtureSession)
    await expect(auth.getState()).resolves.toEqual({
      kind: 'signed-in',
      identity: {
        provider: 'google',
        subject: 'fixture-contributor',
        email: 'fixture-contributor@birdnerd.test',
        displayName: undefined,
      },
    })

    await auth.signOut()
    expect(port.auth.signOut).toHaveBeenCalledOnce()
  })

  it('rejects an unknown action without sending an arbitrary password request', async () => {
    const { port } = makePort()
    const auth = createLocalFixtureAuthModule(port, profiles)

    await auth.beginSignIn('outside-account')

    expect(port.auth.signInWithPassword).not.toHaveBeenCalled()
    await expect(auth.getState()).resolves.toMatchObject({ kind: 'error', message: 'The selected sign-in method is unavailable.' })
  })

  it('recognizes loopback URLs only', () => {
    expect(isLoopbackSupabaseUrl('http://127.0.0.1:54321')).toBe(true)
    expect(isLoopbackSupabaseUrl('https://pilot.supabase.co')).toBe(false)
  })
})
