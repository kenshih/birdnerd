import { expect, test } from '@playwright/test'
import {
  chooseFirstSession,
  createSession,
  entitySection,
  fieldSelect,
  openFieldData,
  receiveBand,
  selectManagedBand,
} from './helpers'

test('pilot creates offline-first records and surfaces a physical-band conflict', async ({ page, context }) => {
  await openFieldData(page)
  await expect(page.getByText('Playwright Field Workspace')).toBeVisible()

  await context.setOffline(true)
  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  await receiveBand(page, '1234-56789')
  await page.getByRole('button', { name: 'sessions', exact: true }).click()
  await createSession(page)
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)

  for (const species of ['SOSP', 'WIWA']) {
    await selectManagedBand(page, '1234-56789')
    // Selecting an already-deployed Band defaults correctly to Recapture. Force
    // a second new-deployment fact to exercise deterministic conflict evidence.
    if (species === 'WIWA') await fieldSelect(page, 'Capture code').selectOption('1')
    await page.getByLabel('Species code').fill(species)
    await page.getByRole('button', { name: 'Save offline', exact: true }).click()
    await expect(entitySection(page, 'Banding Records')).toContainText(species)
  }

  await expect(page.getByText('Band allocation conflict: 1234-56789')).toBeVisible()
  await expect(page.getByText(/Both new-deployment facts remain/)).toBeVisible()
  await expect(page.getByText(/Offline —/).first()).toBeVisible()
  // The Vite test server has no production service worker, so reconnect only
  // for navigation; IndexedDB still proves the offline writes survived reload.
  await context.setOffline(false)
  await page.reload()
  await page.getByRole('button', { name: /Field Data/ }).click()
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await expect(page.getByText('Band allocation conflict: 1234-56789')).toBeVisible()
})
