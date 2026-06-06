import { test, expect } from '@playwright/test'
import { openBandList, deployBand } from './helpers'

/**
 * Deleting a band that's referenced by a record (deployed) must surface a soft
 * warning before removing it — those records remain but lose their band link.
 * Guards the FK-aware delete confirmation in BandHistoryView.
 */
test('deleting a deployed band warns that records reference it', async ({ page }) => {
  // capture the blocking confirm() inline — it must be handled during the click
  let dialogMessage = ''
  page.on('dialog', d => { dialogMessage = d.message(); void d.accept() })

  // deploy a band (gives it one referencing record)
  const band = await deployBand(page)

  // open the band's detail and delete it
  await openBandList(page)
  await page.getByRole('button', { name: new RegExp(band) }).click() // Band History
  await page.getByRole('button', { name: /^Delete$/ }).click()

  // the confirm warned about referencing records, and the band is gone
  expect(dialogMessage).toMatch(/banding record/)
  await expect(page.getByRole('button', { name: new RegExp(band) })).toHaveCount(0)
})
