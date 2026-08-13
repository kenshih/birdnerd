import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { decideAmendBandingRecord, decideCreateBandingRecord, decideCreateSession, projectPilotBanding } from './pilotBanding.js'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const userId = '018f8c7b-0000-7000-8000-000000000002'
const sessionId = '018f8c7b-0000-7000-8000-000000000003'
const recordA = '018f8c7b-0000-7000-8000-000000000004'
const recordB = '018f8c7b-0000-7000-8000-000000000005'
const actor = { kind: 'user-account' as const, user_account_id: userId }

function context(physical_ms: number, logical = 0) {
  return { workspace_id: workspaceId, actor, hlc: { physical_ms, logical }, occurred_at: new Date(physical_ms).toISOString() }
}

describe('pilot banding commands and projection', () => {
  it('creates partial Sessions and Banding Records', () => {
    const session = decideCreateSession(context(1000), { session_id: sessionId, session_date: '2026-08-13' })
    const record = decideCreateBandingRecord([session], context(1001), { session_id: sessionId, record_id: recordA, species_code: 'SOSP' })
    const projection = projectPilotBanding([record, session])

    expect(projection.sessions.get(sessionId)?.session_date).toBe('2026-08-13')
    expect(projection.banding_records.get(recordA)).toMatchObject({ species_code: 'SOSP' })
    expect(projection.banding_records.get(recordA)?.band_number).toBeUndefined()
  })

  it('converges field amendments by HLC then Event ID regardless of replay order', () => {
    const session = decideCreateSession(context(1000), { session_id: sessionId })
    const record = decideCreateBandingRecord([session], context(1001), { session_id: sessionId, record_id: recordA, species_code: 'SOSP' })
    const low = createEvent({ ...context(1002), event_id: '018f8c7b-0000-7000-8000-000000000010', command_id: '018f8c7b-0000-7000-8000-000000000012', event_type: 'banding-record.fields-amended', payload: { record_id: recordA, fields: { species_code: 'AMRO', sex: 'M' } } })
    const high = createEvent({ ...context(1002), event_id: '018f8c7b-0000-7000-8000-000000000011', command_id: '018f8c7b-0000-7000-8000-000000000013', event_type: 'banding-record.fields-amended', payload: { record_id: recordA, fields: { species_code: 'WIWA' } } })

    expect(projectPilotBanding([session, record, low, high]).banding_records.get(recordA)).toMatchObject({ species_code: 'WIWA', sex: 'M' })
    expect(projectPilotBanding([high, low, record, session]).banding_records.get(recordA)).toMatchObject({ species_code: 'WIWA', sex: 'M' })
  })

  it('retains both allocation facts and exposes a physical-band conflict', () => {
    const session = decideCreateSession(context(1000), { session_id: sessionId })
    const first = decideCreateBandingRecord([session], context(1001), { session_id: sessionId, record_id: recordA, band_number: '1234-56789' })
    const second = decideCreateBandingRecord([session, first], context(1002), { session_id: sessionId, record_id: recordB, band_number: '1234-56789' })
    const projection = projectPilotBanding([session, first, second])

    expect(projection.banding_records.size).toBe(2)
    expect(projection.band_allocation_conflicts).toEqual([{ band_number: '1234-56789', record_ids: [recordA, recordB] }])
  })

  it('requires an existing record for amendment and accepts partial changes', () => {
    const session = decideCreateSession(context(1000), { session_id: sessionId })
    const record = decideCreateBandingRecord([session], context(1001), { session_id: sessionId, record_id: recordA })
    expect(decideAmendBandingRecord([session, record], context(1002), recordA, { notes: 'checked' }).payload.fields).toEqual({ notes: 'checked' })
    expect(() => decideAmendBandingRecord([session], context(1002), recordA, { notes: 'missing' })).toThrow('does not exist')
  })
})
