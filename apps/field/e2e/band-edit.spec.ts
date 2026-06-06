import { test, expect, type Page } from '@playwright/test'
import { gotoHome } from './helpers'

/** Phase 24 commit 4b: modify (size/type/status) and delete a band from inventory. */
async function addOneBand(page: Page) {
  await page.getByRole('button', { name: /Add Bands/i }).click()
  await page.getByPlaceholder('e.g. 1154').fill('1154')
  await page.getByPlaceholder('e.g. 81501').fill('00001')
  await page.getByPlaceholder('e.g. 81550').fill('00001')
  await page.locator('select', { has: page.locator('option', { hasText: '— Select size —' }) }).selectOption('1B')
  await page.getByRole('button', { name: /^Add \d+ Band/ }).click()
  await expect(page.getByRole('button', { name: /View All Bands/i })).toBeVisible()
}

test('a band can be modified and deleted from inventory', async ({ page }) => {
  page.on('dialog', d => d.accept()) // accept the delete confirmation

  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await addOneBand(page)
  await page.getByRole('button', { name: /View All Bands/i }).click()

  // open detail, edit the band type
  await page.getByRole('button', { name: /1154-00001/ }).click()
  await page.getByRole('button', { name: /^Edit$/ }).click()
  await page.getByLabel('Band type').selectOption('Lock-on')
  await page.getByRole('button', { name: /^Save$/ }).click()

  // back in the list, the row reflects the new type
  await page.getByText('← Back').click()
  await expect(page.getByRole('button', { name: /1154-00001/ })).toContainText('Lock-on')

  // delete it
  await page.getByRole('button', { name: /1154-00001/ }).click()
  await page.getByRole('button', { name: /^Delete$/ }).click()
  await expect(page.getByRole('button', { name: /1154-00001/ })).toHaveCount(0)
})
