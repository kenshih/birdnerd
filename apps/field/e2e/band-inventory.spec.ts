import { test, expect } from '@playwright/test'
import { openBandInventory } from './helpers'

/**
 * Phase 24 commit 4a: band inventory by size & type summary, string ranges
 * (by 100s), CSV export, and the removed list cap. The aggregation/grouping/CSV
 * logic is unit-tested in bandInventory.test.ts; this covers the add→persist→
 * summarize→list flow end-to-end.
 */
test('added bands appear by size+type, list in full, and group into strings', async ({ page }) => {
  await openBandInventory(page)

  // Product-red: Phase 31 receiving must retain batch range, size, and type.
  const prefix = page.getByLabel('Prefix', { exact: true })
  await expect(prefix).toBeVisible()
  await prefix.fill('1154')
  await page.getByLabel('Start', { exact: true }).fill('00001')
  await page.getByLabel('End', { exact: true }).fill('00005')
  await page.getByLabel('Band Size', { exact: true }).selectOption('1B')
  await page.getByLabel('Band type', { exact: true }).selectOption('Lock-on')
  await page.getByRole('button', { name: /^Add 5 Bands$/ }).click()
  await expect(page.getByText('By Size & Type')).toBeVisible()
  await expect(page.getByText('Lock-on')).toBeVisible()
  await expect(page.getByText('Export Inventory (CSV)')).toBeVisible()

  await page.getByRole('button', { name: /View All Bands/i }).click()
  await expect(page.getByText('Strings by 100s', { exact: false })).toBeVisible()
  await expect(page.getByText('1154-00005', { exact: true })).toBeVisible()
})
