import { test, expect, type Page } from '@playwright/test'
import { gotoHome } from './helpers'

/**
 * Phase 24 commit 4a: band inventory by size & type summary, string ranges
 * (by 100s), CSV export, and the removed list cap. The aggregation/grouping/CSV
 * logic is unit-tested in bandInventory.test.ts; this covers the add→persist→
 * summarize→list flow end-to-end.
 */
async function addBatch(page: Page, prefix: string, start: string, end: string, size: string, type: string) {
  await page.getByRole('button', { name: /Add Bands/i }).click()
  await page.getByPlaceholder('e.g. 1154').fill(prefix)
  await page.getByPlaceholder('e.g. 81501').fill(start)
  await page.getByPlaceholder('e.g. 81550').fill(end)
  await page.locator('select', { has: page.locator('option', { hasText: '— Select size —' }) }).selectOption(size)
  await page.locator('select', { has: page.locator('option', { hasText: 'Lock-on' }) }).selectOption(type)
  await page.getByRole('button', { name: /^Add \d+ Band/ }).click()
  await expect(page.getByText('By Size & Type')).toBeVisible()
}

test('added bands appear by size+type, list in full, and group into strings', async ({ page }) => {
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await addBatch(page, '1154', '00001', '00005', '1B', 'Lock-on')

  await expect(page.getByText('Lock-on')).toBeVisible()
  await expect(page.getByText('Export Inventory (CSV)')).toBeVisible()

  await page.getByRole('button', { name: /View All Bands/i }).click()
  await expect(page.getByText('Strings by 100s', { exact: false })).toBeVisible()
  await expect(page.getByText('1154-00005', { exact: true })).toBeVisible()
})
