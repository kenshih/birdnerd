import { describe, expect, it } from 'vitest'
import { formatSyncStatus } from './syncStatusText'

describe('formatSyncStatus', () => {
  it('shows a deferred dependency count, reason, and deterministic retry time', () => {
    expect(formatSyncStatus({
      kind: 'deferred',
      deferred: 2,
      message: 'Session is not indexed yet.',
      retry_at: 1_787_337_900_000,
    })).toBe('Waiting to retry 2 Events at 2026-08-21T18:45:00Z (Session is not indexed yet.)')
  })
})
