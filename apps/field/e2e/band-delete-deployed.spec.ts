import { test, expect } from '@playwright/test'
import { deployBand, entityRow } from './helpers'

/**
 * Phase 31 intentionally replaces hard deletion with reversible deactivation.
 * A deployed Band remains in immutable history and can be reactivated.
 */
test('a deployed band is deactivated and reactivated without deleting history', async ({ page }) => {
  const band = await deployBand(page)

  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  const row = entityRow(page, 'Inventory', band)
  await row.getByRole('button', { name: 'Deactivate', exact: true }).click()
  await expect(row).toContainText('(inactive)')

  await row.getByRole('button', { name: 'Reactivate', exact: true }).click()
  await expect(row).not.toContainText('(inactive)')

  await page.getByRole('button', { name: 'records', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Banding Records', exact: true }).locator('..')).toContainText(band)
})
