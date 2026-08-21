import { test, expect } from '@playwright/test'
import { entityRow, openBandInventory, receiveBand } from './helpers'

/** Band metadata amendments remain distinct from intentional deactivation. */
test('a band type can be amended in event-backed inventory', async ({ page }) => {
  const band = '1154-00001'
  await openBandInventory(page)
  await receiveBand(page, band)

  await entityRow(page, 'Inventory', band).getByRole('button', { name: 'Correct', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Amend Band', exact: true })).toBeVisible()

  // Product-red until the Band Event contract retains type metadata.
  const bandType = page.getByLabel('Band type', { exact: true })
  await expect(bandType).toBeVisible()
  await bandType.selectOption('Lock-on')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entityRow(page, 'Inventory', band)).toContainText('Lock-on')
})
