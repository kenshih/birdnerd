import { validateRecord } from './validation'

export type OperationalRecordDraft = Readonly<Record<string, string | boolean | undefined>>

export type OperationalRecordValidationContext = {
  band_status?: string
  band_size?: string
  is_own_band?: boolean
}

export type OperationalRecordWarningField =
  | 'bp'
  | 'cp'
  | 'skull'
  | 'notes'
  | 'disposition'
  | 'status'
  | 'capture_code'
  | 'managed_band'
  | 'wing'
  | 'body_mass'
  | 'tail'

export type OperationalRecordWarnings = Partial<Record<OperationalRecordWarningField, string>>

/**
 * Adapts the event-backed Record draft to the established validation rules and
 * maps each result back to the field presented by the operational editor.
 */
export function validateOperationalRecord(
  draft: OperationalRecordDraft,
  context: OperationalRecordValidationContext = {},
): OperationalRecordWarnings {
  const warnings = validateRecord({
    sex: text(draft.sex),
    bp: text(draft.bp),
    cp: text(draft.cp),
    howAged: text(draft.how_aged),
    howAged2: text(draft.how_aged_2),
    howSexed: text(draft.how_sexed),
    howSexed2: text(draft.how_sexed_2),
    skull: text(draft.skull),
    status: text(draft.status),
    disposition: text(draft.disposition),
    bloodSample: Boolean(draft.blood_sample),
    notes: text(draft.notes),
    bandStatus: context.band_status,
    captureCode: text(draft.capture_code),
    isOwnBand: context.is_own_band,
    bandSize: context.band_size,
    speciesCode: text(draft.species_code),
    wing: number(draft.wing),
    bodyMass: number(draft.body_mass),
    tail: number(draft.tail),
  })

  return {
    ...(warnings.bp ? { bp: warnings.bp } : {}),
    ...(warnings.cp ? { cp: warnings.cp } : {}),
    ...(warnings.skull ? { skull: warnings.skull } : {}),
    ...(warnings.notes ? { notes: warnings.notes } : {}),
    ...(warnings.disposition ? { disposition: warnings.disposition } : {}),
    ...(warnings.status ? { status: warnings.status } : {}),
    ...(warnings.bbpCode ? { capture_code: warnings.bbpCode } : {}),
    ...(warnings.bandSize ? { managed_band: warnings.bandSize } : {}),
    ...(warnings.wing ? { wing: warnings.wing } : {}),
    ...(warnings.bodyMass ? { body_mass: warnings.bodyMass } : {}),
    ...(warnings.tail ? { tail: warnings.tail } : {}),
  }
}

function text(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function number(value: string | boolean | undefined): number | undefined {
  if (typeof value !== 'string' || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
