import { test, expect } from '@playwright/test'
import { deployBand, entityRow, fieldSelect, selectManagedBand } from './helpers'

/**
 * Recapture flow: a second record on an already-deployed band (capture code R)
 * links to the same band without changing its status, and the band's history
 * shows both encounters. Guards the band↔record linkage + that recapture does
 * NOT re-deploy / reset an already-deployed band.
 */
test('a recapture links to the deployed band and shows two encounters', async ({ page }) => {
  // deploy a band via a new banding (encounter 1)
  const band = await deployBand(page)

  // recapture the same band in the same session (encounter 2)
  await selectManagedBand(page, band)
  await expect(fieldSelect(page, 'Capture code')).toHaveValue('R')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Banding Records', exact: true }).locator('..').locator(':scope > div')).toHaveCount(2)

  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  // Product-red until Inventory exposes retained encounter history.
  await expect(entityRow(page, 'Inventory', band)).toContainText('2 encounters')
})
