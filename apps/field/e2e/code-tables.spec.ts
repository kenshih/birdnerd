import { test, expect } from '@playwright/test'
import { openNewRecordForm, openAddBandsForm } from './helpers'

/**
 * Regression guard for the Phase 24 commit-1 code-table edits. These lists are
 * NOT expected to churn during the rest of Phase 24, so locking their contents
 * here is safe. (Churning items — G Covs rename, Condition reorder, Age/How-Aged
 * adjacency — are intentionally NOT asserted yet; they'll get coverage once that
 * UI settles.) Em dashes (—) match the labels in codes.ts / bandingCodes.ts.
 */

test('band size options include 4A, 5, 6', async ({ page }) => {
  await openAddBandsForm(page)
  const size = page.locator('select', { has: page.locator('option', { hasText: '— Select size —' }) })
  const opts = await size.locator('option').allTextContents()
  for (const v of ['4A', '5', '6']) expect(opts).toContain(v)
})

test('skull adds "8 — Invisible" and drops "X — Not checked"', async ({ page }) => {
  await openNewRecordForm(page)
  const skull = await page.locator('select[name="skull"] option').allTextContents()
  expect(skull).toContain('8 — Invisible')
  expect(skull.some(t => /not checked/i.test(t))).toBe(false)
})

test('disposition adds "X — Ectoparasite"', async ({ page }) => {
  await openNewRecordForm(page)
  const disp = await page.locator('select[name="disposition"] option').allTextContents()
  expect(disp).toContain('X — Ectoparasite')
})
