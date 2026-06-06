import { test, expect } from '@playwright/test'
import { openBandList, deployBand, selectBand } from './helpers'

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
  await page.getByRole('button', { name: /New Bird Record/i }).click()
  await selectBand(page, band)
  await page.locator('select[name="bbpCode"]').selectOption('R') // recapture
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible()

  // band is still deployed, and its history shows both encounters
  await openBandList(page)
  const bandRow = page.getByRole('button', { name: new RegExp(band) })
  await expect(bandRow).toContainText('deployed')
  await bandRow.click() // open Band History
  await expect(page.getByText(/2 encounters/)).toBeVisible()
})
