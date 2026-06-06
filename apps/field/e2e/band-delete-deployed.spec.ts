import { test, expect } from '@playwright/test'
import { gotoHome, openNewRecordForm, addBandBatch, selectBand } from './helpers'

/**
 * Deleting a band that's referenced by a record (deployed) must surface a soft
 * warning before removing it — those records remain but lose their band link.
 * Guards the FK-aware delete confirmation in BandHistoryView.
 */
test('deleting a deployed band warns that records reference it', async ({ page }) => {
  let dialogMessage = ''
  page.on('dialog', d => { dialogMessage = d.message(); void d.accept() })

  // deploy a band (gives it one referencing record)
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await addBandBatch(page, '1154', '00001', '00001', '1B', 'Standard')
  await openNewRecordForm(page)
  await selectBand(page, '1154-00001')
  await page.locator('select[name="bbpCode"]').selectOption('1')
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible()

  // open the band's detail and delete it
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await page.getByRole('button', { name: /View All Bands/i }).click()
  await page.getByRole('button', { name: /1154-00001/ }).click() // Band History
  await page.getByRole('button', { name: /^Delete$/ }).click()

  // the confirm warned about referencing records, and the band is gone
  expect(dialogMessage).toMatch(/banding record/)
  await expect(page.getByRole('button', { name: /1154-00001/ })).toHaveCount(0)
})
