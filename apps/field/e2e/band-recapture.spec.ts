import { test, expect } from '@playwright/test'
import { gotoHome, openNewRecordForm, addBandBatch, selectBand } from './helpers'

/**
 * Recapture flow: a second record on an already-deployed band (capture code R)
 * links to the same band without changing its status, and the band's history
 * shows both encounters. Guards the band↔record linkage + that recapture does
 * NOT re-deploy / reset an already-deployed band.
 */
test('a recapture links to the deployed band and shows two encounters', async ({ page }) => {
  // deploy a band via a new banding (encounter 1)
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await addBandBatch(page, '1154', '00001', '00001', '1B', 'Standard')

  await openNewRecordForm(page)
  await selectBand(page, '1154-00001')
  await page.locator('select[name="bbpCode"]').selectOption('1') // new banding
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible()

  // recapture the same band in the same session (encounter 2)
  await page.getByRole('button', { name: /New Bird Record/i }).click()
  await selectBand(page, '1154-00001')
  await page.locator('select[name="bbpCode"]').selectOption('R') // recapture
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible()

  // band is still deployed, and its history shows both encounters
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await page.getByRole('button', { name: /View All Bands/i }).click()
  const bandRow = page.getByRole('button', { name: /1154-00001/ })
  await expect(bandRow).toContainText('deployed')
  await bandRow.click() // open Band History
  await expect(page.getByText(/2 encounters/)).toBeVisible()
})
