import { test, expect } from '@playwright/test'
import { gotoHome, openNewRecordForm, addBandBatch, selectBand, openBandList } from './helpers'

/**
 * #3 Band deployment flow: recording a new banding on an available band must
 * flip that band's inventory status to "deployed" (doSave side-effect when the
 * selected band is available + the capture code is a new banding). Core daily
 * action with real cross-entity state; nothing else covered it.
 */
test('a new banding deploys the selected band', async ({ page }) => {
  // 1. add an available band to inventory
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await addBandBatch(page, '1154', '00001', '00001', '1B', 'Standard')

  // 2. record a new banding on that band
  await openNewRecordForm(page)
  await selectBand(page, '1154-00001')
  await page.locator('select[name="bbpCode"]').selectOption('1') // new band
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible() // saved + listed

  // 3. the band now reads "deployed" in inventory
  await openBandList(page)
  await expect(page.getByRole('button', { name: /1154-00001/ })).toContainText('deployed')
})
