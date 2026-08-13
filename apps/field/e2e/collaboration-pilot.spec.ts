import { expect, test } from '@playwright/test'
import { gotoHome } from './helpers'

test('pilot creates offline-first records and surfaces a physical-band conflict', async ({ page, context }) => {
  await gotoHome(page)
  await page.getByText('Collaboration Pilot').click()
  await expect(page.getByText('Playwright Field Workspace')).toBeVisible()

  await context.setOffline(true)
  await page.getByLabel('Location').fill('North Station')
  await page.getByRole('button', { name: 'Create Session' }).click()
  await page.getByText('North Station').click()

  for (const species of ['SOSP', 'WIWA']) {
    await page.getByLabel('Physical band').fill('1234-56789')
    await page.getByLabel('Species code').fill(species)
    await page.getByRole('button', { name: 'Create Record' }).click()
    await expect(page.getByRole('button', { name: new RegExp(`${species} 1234-56789`) })).toBeVisible()
  }

  await expect(page.getByText('Band allocation conflicts')).toBeVisible()
  await expect(page.getByText(/assigned to 2 records/)).toBeVisible()
  await expect(page.getByText(/Offline/).first()).toBeVisible()
  // The Vite test server has no production service worker, so reconnect only
  // for navigation; IndexedDB still proves the offline writes survived reload.
  await context.setOffline(false)
  await page.reload()
  await page.getByText('Collaboration Pilot').click()
  await expect(page.getByText('Band allocation conflicts')).toBeVisible()
})
