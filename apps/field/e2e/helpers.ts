import { type Page, expect } from '@playwright/test'

/**
 * Centralized navigation so Phase 24's form/view reorg only breaks one place.
 * Each fresh Playwright context starts with an empty IndexedDB; the app seeds
 * public/data/seed.json on first launch (2 locations, 5 banders, 10 nets), so
 * a location exists and the session "Create" button is enabled by default.
 */

export async function gotoHome(page: Page) {
  await page.goto('/birdnerd/')
  await expect(page.getByText('Session Data')).toBeVisible()
}

/** Home → Session Data → New Session (auto-located) → New Bird Record form. */
export async function openNewRecordForm(page: Page) {
  await gotoHome(page)
  await page.getByText('Session Data').first().click()
  await page.getByRole('button', { name: /New Session/i }).click()
  await page.getByRole('button', { name: /^Create$/ }).click()
  await page.getByRole('button', { name: /New Bird Record/i }).click()
  await expect(page.getByRole('button', { name: /Save Record/i }).first()).toBeVisible()
}

/** Home → Band Inventory → Add Bands form. */
export async function openAddBandsForm(page: Page) {
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await page.getByRole('button', { name: /Add Bands/i }).click()
  await expect(page.getByText('— Select size —')).toBeAttached()
}

/** From the Band Inventory overview: add a batch of bands (leaves you on the overview). */
export async function addBandBatch(
  page: Page, prefix: string, start: string, end: string, size: string, type = 'Standard',
) {
  await page.getByRole('button', { name: /Add Bands/i }).click()
  await page.getByPlaceholder('e.g. 1154').fill(prefix)
  await page.getByPlaceholder('e.g. 81501').fill(start)
  await page.getByPlaceholder('e.g. 81550').fill(end)
  await page.locator('select', { has: page.locator('option', { hasText: '— Select size —' }) }).selectOption(size)
  await page.locator('select', { has: page.locator('option', { hasText: 'Lock-on' }) }).selectOption(type)
  await page.getByRole('button', { name: /^Add \d+ Band/ }).click()
  await expect(page.getByText('By Size & Type')).toBeVisible()
}

/**
 * A "rich" banding record fixture — values across every form section — used to
 * guard data round-trips (form save→reopen, bundle export→import). It targets
 * the `ALL_FIELDS`/register-completeness class of bug (e.g. the Alula load gap):
 * if a field stops persisting/reloading, the round-trip assertion fails.
 *
 * Excludes species (custom autocomplete) and band (needs inventory) by design;
 * numbers avoid trailing zeros so they reload as the same string. Fields are
 * addressed by their `name` (react-hook-form `register` sets it).
 */
export const richRecord = {
  selects: {
    bbpCode: '1', age: '1', sex: 'F', howAged: 'SK', howSexed: 'CC',
    skull: '6', cp: '2', bp: '3', fat: '4',
    bodyMolt: '2', ffMolt: 'S', ffWear: '3', juvBodyPlumage: '1',
    moltLimitsPCovs: 'F', moltLimitsSCovs: 'B', moltLimitsAlula: 'F',
    moltLimitsPP: 'R', moltLimitsSS: 'M', moltLimitsTert: 'L',
    moltLimitsRec: 'N', moltLimitsBodyPlum: 'J', moltLimitsNonFeather: 'U',
    status: '300', disposition: 'X',
  } as Record<string, string>,
  inputs: {
    captureTime: '07:30', releaseTime: '08:00',
    wing: '67', tail: '55', tarsus: '22.5', exposedCulmen: '11.2', bodyMass: '18.3',
  } as Record<string, string>,
  notes: 'round-trip fixture',
  checkboxes: ['featherPull', 'bloodSample'],
}

/** Fill the open New Bird Record form with the rich fixture. */
export async function fillRichRecord(page: Page) {
  for (const [name, value] of Object.entries(richRecord.selects)) {
    await page.locator(`select[name="${name}"]`).selectOption(value)
  }
  for (const [name, value] of Object.entries(richRecord.inputs)) {
    await page.locator(`input[name="${name}"]`).fill(value)
  }
  await page.locator('textarea[name="notes"]').fill(richRecord.notes)
  for (const name of richRecord.checkboxes) {
    await page.locator(`input[name="${name}"]`).check()
  }
}

/** Assert the rich fixture's values are present (works on an editable or disabled form). */
export async function assertRichRecord(page: Page) {
  for (const [name, value] of Object.entries(richRecord.selects)) {
    await expect(page.locator(`select[name="${name}"]`)).toHaveValue(value)
  }
  for (const [name, value] of Object.entries(richRecord.inputs)) {
    await expect(page.locator(`input[name="${name}"]`)).toHaveValue(value)
  }
  await expect(page.locator('textarea[name="notes"]')).toHaveValue(richRecord.notes)
  for (const name of richRecord.checkboxes) {
    await expect(page.locator(`input[name="${name}"]`)).toBeChecked()
  }
}
