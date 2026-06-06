import { test, expect } from '@playwright/test'
import { openNewRecordForm, fillRichRecord, assertRichRecord } from './helpers'

/**
 * Data round-trip #1: a fully-populated record survives save and re-open for
 * edit. Guards the `ALL_FIELDS`/register-completeness class of bug — e.g. the
 * Alula field that saved but didn't reload (commit 2). If any fixture field
 * stops round-tripping, this fails.
 */
test('a fully-filled record survives save and re-open for edit', async ({ page }) => {
  await openNewRecordForm(page)
  await fillRichRecord(page)
  await page.getByRole('button', { name: /Save Record/i }).first().click()

  await page.getByRole('button', { name: /^Edit$/ }).first().click()
  await expect(page.getByRole('heading', { name: /Edit Record/i })).toBeVisible()
  await assertRichRecord(page)
})
