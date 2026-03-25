/**
 * Banding record validation rules.
 * Pure function — no DB or React dependencies. Returns a map of field name → warning message.
 * All warnings are soft (never block saving).
 */

export interface ValidationInput {
  sex?: string
  bp?: string
  cp?: string
  howAged?: string
  howAged2?: string
  howSexed?: string
  howSexed2?: string
  age?: string
  skull?: string
  status?: string
  disposition?: string
  bloodSample?: boolean
  notes?: string
  net?: string
}

export type ValidationWarnings = Partial<Record<string, string>>

/**
 * Evaluate all validation rules against current form values.
 * @param values - Current form field values
 * @param sessionNetLabels - Set of net labels that are in this session's effort log (from SessionNetLog)
 */
export function validateRecord(
  values: ValidationInput,
  sessionNetLabels?: Set<string>,
): ValidationWarnings {
  const warnings: ValidationWarnings = {}

  // Sex=M + Brood Patch 3/4 → error on BP
  if (values.sex === 'M' && (values.bp === '3' || values.bp === '4')) {
    warnings.bp = 'Sex=M conflicts with Brood Patch 3/4'
  }

  // Sex=F + Cloacal Protuberance 1-3 → error on CP
  if (values.sex === 'F' && values.cp && ['1', '2', '3'].includes(values.cp)) {
    warnings.cp = 'Sex=F conflicts with Cloacal Protuberance'
  }

  // SK in How Aged → require Skull field
  const agedBySK = values.howAged === 'SK' || values.howAged2 === 'SK'
  if (agedBySK && !values.skull) {
    warnings.skull = 'Skull required when aged by SK'
  }

  // How Aged/Sexed = OT → require note
  const otInHowAged = values.howAged === 'OT' || values.howAged2 === 'OT'
  const otInHowSexed = values.howSexed === 'OT' || values.howSexed2 === 'OT'
  if ((otInHowAged || otInHowSexed) && !values.notes?.trim()) {
    warnings.notes = 'Note required when How Aged/Sexed = Other'
  }

  // Status 500 → require disposition + note
  if (values.status === '500') {
    if (!values.disposition) {
      warnings.disposition = 'Disposition required for Status 500'
    }
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Status 500'
        : 'Note required for Status 500'
    }
  }

  // Mortality (Status "---") → require note
  if (values.status === '---') {
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Mortality'
        : 'Note required for Mortality'
    }
  }

  // Status OT → require note
  if (values.status === 'OT') {
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Status=Other'
        : 'Note required for Status=Other'
    }
  }

  // Blood Sample checked → status should be 318
  if (values.bloodSample && values.status && values.status !== '318' && values.status !== '319' && values.status !== '334') {
    warnings.status = 'Blood sample taken — expected Status 318, 319, or 334'
  }

  // Net not in session effort log
  if (values.net && sessionNetLabels && sessionNetLabels.size > 0 && !sessionNetLabels.has(values.net)) {
    warnings.net = `Net ${values.net} not in session effort log`
  }

  return warnings
}
