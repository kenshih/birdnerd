import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openNewRecordForm, fillRichRecord, assertRichRecord, richRecord } from './helpers'

/**
 * Data round-trip #2: the JSON backup (Data Manager) — the safety net for
 * Hallie's whole dataset. A rich record must survive Export Backup → Import
 * with no field lost, across bundle schema v5. Catches schema/migration
 * regressions (the silent-data-loss class) in the serialize/deserialize path.
 */
test('rich record survives a JSON backup export → import round-trip', async ({ page }) => {
  page.on('dialog', d => d.accept()) // import "replace all data" confirm

  await openNewRecordForm(page)
  await fillRichRecord(page)
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible() // saved + listed

  await page.goto('/birdnerd/')
  await page.getByText('Data Manager').first().click()

  // Export Backup → capture the downloaded JSON
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export Backup/i }).click()
  const file = await (await downloadPromise).path()
  const bundle = JSON.parse(readFileSync(file, 'utf8'))

  // export fidelity: bundle v5, one record, every coded field serialized
  expect(bundle.version).toBe(5)
  expect(bundle.records).toHaveLength(1)
  const rec = bundle.records[0]
  for (const [name, value] of Object.entries(richRecord.selects)) {
    expect(rec[name], `bundle record.${name}`).toBe(value)
  }
  expect(rec.moltLimitsAlula).toBe('F') // the field that regressed in commit 2
  expect(rec.notes).toBe(richRecord.notes)
  expect(rec.featherPull).toBe(true)

  // import fidelity: re-import the file, then read the record back through the UI
  await page.setInputFiles('input[type="file"]', file)
  await expect(page.getByText(/Imported .* items successfully/i)).toBeVisible()
  await page.getByRole('button', { name: /—.*F/ }).first().click() // Browse Records row
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await assertRichRecord(page)
})
