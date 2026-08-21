import { test, expect } from '@playwright/test'
import { deployBand, entityRow } from './helpers'

/**
 * #3 Band deployment flow: recording a new banding on an available band must
 * flip that band's inventory status to "deployed" (doSave side-effect when the
 * selected band is available + the capture code is a new banding). Core daily
 * action with real cross-entity state; nothing else covered it.
 */
test('a new banding deploys the selected band', async ({ page }) => {
  const band = await deployBand(page)

  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  // Product-red until deployment status is visible in event-backed Inventory.
  await expect(entityRow(page, 'Inventory', band)).toContainText('deployed')
})
