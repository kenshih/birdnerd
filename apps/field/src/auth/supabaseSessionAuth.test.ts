import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { createSupabaseSessionAuthModule } from './supabaseSessionAuth'

function makePort(error: Error | null = null) {
  let listener: ((event: AuthChangeEvent, session: null) => void) | undefined
  const unsubscribe = vi.fn()
  const port = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error }),
      onAuthStateChange: vi.fn().mockImplementation(nextListener => {
        listener = nextListener
        return { data: { subscription: { unsubscribe } } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  return { port, emit: (event: AuthChangeEvent) => listener?.(event, null), unsubscribe }
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

  it('surfaces session restoration failure and unsubscribes from further changes', async () => {
    const { port, unsubscribe } = makePort(new Error('Session storage failed.'))
    const auth = createSupabaseSessionAuthModule(port, {
      signInActions: [{ id: 'chosen', label: 'Continue as Chosen' }],
      beginSignIn: vi.fn(),
    })

    await expect(auth.getState()).resolves.toMatchObject({ kind: 'error', message: 'Session storage failed.' })
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('uses the shared sign-out lifecycle when Supabase reports a signed-out session', async () => {
    const { port, emit } = makePort()
    const auth = createSupabaseSessionAuthModule(port, {
      signInActions: [{ id: 'chosen', label: 'Continue as Chosen' }],
      beginSignIn: vi.fn(),
    })
    await auth.getState()

    await auth.signOut()
    emit('SIGNED_OUT')

    expect(port.auth.signOut).toHaveBeenCalledOnce()
    await expect(auth.getState()).resolves.toMatchObject({ kind: 'signed-out' })
  })
})
