import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createSupabaseSessionAuthModule } from './supabaseSessionAuth'

function makePort(error: Error | null = null) {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined
  const port = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error }),
      onAuthStateChange: vi.fn().mockImplementation(nextListener => {
        listener = nextListener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  return { port, emit: (event: AuthChangeEvent, session: Session | null = null) => listener?.(event, session) }
}

describe('shared Supabase session Module', () => {
  it('restores a signed-out action list and preserves it after an interaction error', async () => {
    const { port } = makePort()
    const adapter = {
      signInActions: [{ id: 'chosen', label: 'Continue as Chosen' }],
      beginSignIn: vi.fn().mockResolvedValue({ error: new Error('Bad local credentials.') }),
    }
    const auth = createSupabaseSessionAuthModule(port, adapter)

    await expect(auth.getState()).resolves.toEqual({ kind: 'signed-out', signInActions: adapter.signInActions })
    await auth.beginSignIn('chosen')
    await expect(auth.getState()).resolves.toEqual({ kind: 'error', message: 'Bad local credentials.', signInActions: adapter.signInActions })
  })

  it('keeps observing sessions after a restoration failure so sign-in can recover', async () => {
    const { port, emit } = makePort(new Error('Session storage failed.'))
    const auth = createSupabaseSessionAuthModule(port, {
      signInActions: [{ id: 'chosen', label: 'Continue as Chosen' }],
      beginSignIn: vi.fn().mockResolvedValue({ error: null }),
    })

    await expect(auth.getState()).resolves.toMatchObject({ kind: 'error', message: 'Session storage failed.' })
    await auth.beginSignIn('chosen')
    emit('SIGNED_IN', {
      user: {
        id: 'fixture-user',
        email: 'fixture@example.test',
        app_metadata: { provider: 'google' },
        user_metadata: {},
      },
    } as unknown as Session)
    await expect(auth.getState()).resolves.toMatchObject({
      kind: 'signed-in',
      identity: { provider: 'google', subject: 'fixture-user' },
    })
  })

  it('uses the shared local-session sign-out lifecycle when Supabase reports a signed-out session', async () => {
    const { port, emit } = makePort()
    const auth = createSupabaseSessionAuthModule(port, {
      signInActions: [{ id: 'chosen', label: 'Continue as Chosen' }],
      beginSignIn: vi.fn(),
    })
    await auth.getState()

    await auth.signOut()
    emit('SIGNED_OUT')

    expect(port.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    await expect(auth.getState()).resolves.toMatchObject({ kind: 'signed-out' })
  })
})
