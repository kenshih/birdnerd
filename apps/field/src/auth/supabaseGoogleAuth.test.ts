import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createSupabaseGoogleAuthModule } from './supabaseGoogleAuth'

const session = {
  user: {
    id: 'supabase-user-id',
    email: 'bander@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Bander Example' },
    identities: [{ provider: 'google', identity_data: { sub: 'google-subject-id' } }],
  },
} as unknown as Session

function makePort(initialSession: Session | null = null) {
  let listener: ((event: AuthChangeEvent, nextSession: Session | null) => void) | undefined
  const unsubscribe = vi.fn()
  const port = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation(nextListener => {
        listener = nextListener
        return { data: { subscription: { unsubscribe } } }
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  return { port, emit: (event: AuthChangeEvent, nextSession: Session | null) => listener?.(event, nextSession) }
}

function makeBrowser(hash = '') {
  const replaceState = vi.fn()
  return {
    location: { origin: 'https://kenshih.github.io', pathname: '/birdnerd/', search: '?test=1', hash },
    history: { state: { route: 'home' }, replaceState },
    title: () => 'BirdNerd',
    basePath: '/birdnerd/',
    replaceState,
  }
}

describe('Supabase Google auth adapter', () => {
  it('maps a persisted session to a provider-neutral identity and clears its callback credentials', async () => {
    const { port } = makePort(session)
    const browser = makeBrowser('#access_token=temporary&refresh_token=temporary')
    const auth = createSupabaseGoogleAuthModule(port, browser)

    await expect(auth.getState()).resolves.toEqual({
      kind: 'signed-in',
      identity: {
        provider: 'google',
        subject: 'google-subject-id',
        email: 'bander@example.com',
        displayName: 'Bander Example',
      },
    })
    expect(browser.replaceState).toHaveBeenCalledWith(
      { route: 'home' },
      'BirdNerd',
      '/birdnerd/?test=1',
    )
  })

  it('uses a linked Google identity instead of the account’s historical default provider', async () => {
    const linkedGoogleSession = {
      ...session,
      user: {
        ...session.user,
        app_metadata: { provider: 'email' },
      },
    }
    const { port } = makePort(linkedGoogleSession)

    await expect(createSupabaseGoogleAuthModule(port, makeBrowser()).getState()).resolves.toMatchObject({
      kind: 'signed-in',
      identity: { provider: 'google', subject: 'google-subject-id', email: 'bander@example.com' },
    })
  })

  it('uses the Field base path for the Google OAuth return URL', async () => {
    const { port } = makePort()
    const auth = createSupabaseGoogleAuthModule(port, makeBrowser())

    await auth.beginSignIn()

    expect(port.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://kenshih.github.io/birdnerd/',
        scopes: 'openid email profile',
      },
    })
  })

  it('publishes sign-in and sign-out changes to callers', async () => {
    const { port, emit } = makePort()
    const auth = createSupabaseGoogleAuthModule(port, makeBrowser())
    const states: string[] = []
    auth.subscribe(state => states.push(state.kind))

    await auth.getState()
    emit('SIGNED_IN', session)
    emit('SIGNED_OUT', null)

    expect(states).toEqual(['signed-out', 'signed-in', 'signed-out'])
  })
})
