import { test, expect } from '@playwright/test'
import { openNewRecordForm } from './helpers'

/**
 * Phase 24 commit 2: the molt-limits "S Covs" tract is relabeled "G Covs" and a
 * new "Alula" tract is added immediately after it. The molt section is settled
 * for this phase, so asserting these labels is safe.
 */
test('molt section shows G Covs and Alula, and no longer shows S Covs', async ({ page }) => {
  await openNewRecordForm(page)
  await expect(page.getByText('G Covs', { exact: true })).toBeVisible()
  await expect(page.getByText('Alula', { exact: true })).toBeVisible()
  await expect(page.getByText('S Covs', { exact: true })).toHaveCount(0)
})

test('Alula molt-limit value persists across save and re-open for edit', async ({ page }) => {
  await openNewRecordForm(page)
  await page.locator('select[name="moltLimitsAlula"]').selectOption('F')
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  // back in the session view — re-open the saved record for editing
  await page.getByRole('button', { name: /^Edit$/ }).first().click()
  await expect(page.locator('select[name="moltLimitsAlula"]')).toHaveValue('F')
})
