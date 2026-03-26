/**
 * Generate an auto-named filename for a bird photo.
 * Format: YYYY-MM-DD_STATION_SPECIES_BAND#_BODYPART.jpg
 * Unbanded: YYYY-MM-DD_STATION_SPECIES_UNBANDED003_BODYPART.jpg
 */
export function generatePhotoFilename(params: {
  date: string           // YYYY-MM-DD
  station: string        // e.g. "GCBS"
  species: string        // e.g. "SOSP" or empty
  bandNumber: string     // e.g. "1234-56789" or "UNBANDED"
  recordSequence: number // 1-based index in session
  bodyPart: string       // e.g. "WING"
}): string {
  const { date, station, species, bandNumber, recordSequence, bodyPart } = params

  const bandId = (!bandNumber || bandNumber === 'UNBANDED')
    ? `UNBANDED${String(recordSequence).padStart(3, '0')}`
    : bandNumber

  const parts = [
    date,
    station || 'UNKN',
    species || 'UNKN',
    bandId,
    bodyPart || 'PHOTO',
  ]

  // Sanitize: only allow alphanumeric, dash, underscore
  const name = parts.map(p => p.replace(/[^a-zA-Z0-9_-]/g, '')).join('_')
  return `${name}.jpg`
}
