const MAX_BATCH_SIZE = 2000

export type BandRangeInput = {
  prefix: string
  start_suffix: string
  end_suffix: string
}

export type BandRangeResult =
  | { band_numbers: readonly string[]; error?: never }
  | { band_numbers: readonly []; error: string }

/** Expand the Field's displayed band-number range without touching storage. */
export function expandBandRange(input: BandRangeInput): BandRangeResult {
  if (!/^\d{4}$/.test(input.prefix)) return failure('Prefix must be exactly 4 digits.')
  if (!/^\d{5,6}$/.test(input.start_suffix)) return failure('Start suffix must be 5–6 digits.')
  if (!/^\d{5,6}$/.test(input.end_suffix)) return failure('End suffix must be 5–6 digits.')
  if (input.start_suffix.length !== input.end_suffix.length) return failure('Start and end suffix must have the same number of digits.')
  const start = Number(input.start_suffix)
  const end = Number(input.end_suffix)
  if (end < start) return failure('End suffix must be greater than or equal to start suffix.')
  const count = end - start + 1
  if (count > MAX_BATCH_SIZE) return failure(`Maximum ${MAX_BATCH_SIZE} bands per batch.`)
  return {
    band_numbers: Array.from({ length: count }, (_, index) => `${input.prefix}-${String(start + index).padStart(input.start_suffix.length, '0')}`),
  }
}

function failure(error: string): BandRangeResult {
  return { band_numbers: [], error }
}
