/**
 * Net-check time slots for the capture-time quick-select.
 *
 * Banders check nets on a fixed cadence (usually every 30 min), so offering the
 * standard slots is faster than typing each time. Slots span the session's
 * open→close window (inclusive); when those are missing we fall back to a
 * sensible default window. Capped to avoid an unwieldy list.
 */

/** Parse "HH:mm" → minutes since midnight, or undefined if not valid. */
function parseHHMM(value?: string): number | undefined {
  if (!value) return undefined
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return undefined
  return h * 60 + min
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const DEFAULT_START = 5 * 60 // 05:00
const DEFAULT_SPAN = 7 * 60 // 7 hours
const MAX_SLOTS = 48 // safety cap (24h at 30-min steps)

export function netCheckTimes(open?: string, close?: string, stepMin = 30): string[] {
  const start = parseHHMM(open) ?? DEFAULT_START
  const parsedEnd = parseHHMM(close)
  const end = parsedEnd !== undefined && parsedEnd > start ? parsedEnd : start + DEFAULT_SPAN

  const times: string[] = []
  for (let m = start; m <= end && times.length < MAX_SLOTS; m += stepMin) {
    times.push(toHHMM(m))
  }
  return times
}
