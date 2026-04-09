/**
 * Generate an auto-named filename for a bird photo.
 * Format: DAY_LOCCODE_BANDID_SPECIESCODE_BODYPART.ext
 * Unbanded: DAY_LOCCODE_UNBANDED003_SPECIESCODE_BODYPART.ext
 */
export function generatePhotoFilename(params: {
  date: string           // YYYY-MM-DD
  station: string        // e.g. "GCBS"
  species: string        // e.g. "SOSP" or empty
  bandNumber: string     // e.g. "1234-56789" or "UNBANDED"
  recordSequence: number // 1-based index in session
  bodyPart: string       // e.g. "WING"
  ext?: string           // e.g. "jpg", "heic", "png" — defaults to "jpg"
}): string {
  const { date, station, species, bandNumber, recordSequence, bodyPart, ext } = params

  const bandId = (!bandNumber || bandNumber === 'UNBANDED')
    ? `UNBANDED${String(recordSequence).padStart(3, '0')}`
    : bandNumber

  const parts = [
    date,
    station || 'UNKN',
    bandId,
    species || 'UNKN',
    bodyPart || 'PHOTO',
  ]

  // Sanitize: only allow alphanumeric, dash, underscore
  const name = parts.map(p => p.replace(/[^a-zA-Z0-9_-]/g, '')).join('_')
  return `${name}.${ext || 'jpg'}`
}

/** Extract file extension from a File/Blob mime type or filename. */
export function getFileExtension(file: Blob & { name?: string }): string {
  // Prefer the actual filename extension if available
  if (file.name) {
    const dotIdx = file.name.lastIndexOf('.')
    if (dotIdx > 0) return file.name.slice(dotIdx + 1).toLowerCase()
  }
  // Fall back to mime type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return mimeMap[file.type] || 'jpg'
}
