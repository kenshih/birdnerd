import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { gotoHome } from './helpers'

/**
 * Recovery round-trip through the authenticated E2E access fixture and normal
 * sync coordinator: export an immutable Workspace Event Bundle, sync later
 * work to the deterministic server Adapter, then restore the older Bundle and
 * prove authenticated catch-up pulls the later Event back into the replica.
 */
test('Workspace Event Bundle restore catches up accepted remote Events through normal sync', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept())

  await gotoHome(page)
  await page.getByText('Collaboration Pilot').click()
  await page.getByLabel('Location').fill('North Station')
  await page.getByRole('button', { name: 'Create Session' }).click()
  await page.getByText('North Station').click()
  await page.getByLabel('Physical band').fill('1234-56789')
  await page.getByLabel('Species code').fill('SOSP')
  await page.getByRole('button', { name: 'Create Record' }).click()
  await expect(page.getByRole('button', { name: /SOSP 1234-56789/ })).toBeVisible()
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByText(/^Synced /)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByText('Data Manager').first().click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Event Bundle' }).click()
  const file = await (await downloadPromise).path()
  if (!file) throw new Error('Playwright did not retain the downloaded Event Bundle.')
  const bundle = JSON.parse(readFileSync(file, 'utf8'))

  expect(bundle.format).toBe('birdnerd-workspace-event-bundle')
  expect(bundle.format_version).toBe(1)
  expect(bundle.manifest.event_count).toBe(6)
  expect(bundle.events.slice(-2).map((event: { event_type: string }) => event.event_type)).toEqual([
    'session.created',
    'banding-record.created',
  ])

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByText('Collaboration Pilot').click()
  await page.getByText('North Station').click()
  await page.getByLabel('Physical band').fill('9876-54321')
  await page.getByLabel('Species code').fill('WIWA')
  await page.getByRole('button', { name: 'Create Record' }).click()
  await expect(page.getByRole('button', { name: /WIWA 9876-54321/ })).toBeVisible()
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByText(/^Synced /)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByText('Data Manager').first().click()
  await page.setInputFiles('input[accept=".json"]', file)
  await expect(page.getByText(/Restored 6 Events and protected 0 unsynced local Events/)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByText('Collaboration Pilot').click()
  await expect(page.getByRole('button', { name: /SOSP 1234-56789/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /WIWA 9876-54321/ })).toBeVisible()
})
