import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  chooseFirstSession,
  createForeignRecord,
  entitySection,
  openNewRecordForm,
} from './helpers'

/**
 * Recovery round-trip through the authenticated E2E access fixture and normal
 * sync coordinator: export an immutable Workspace Event Bundle, sync later
 * work to the deterministic server Adapter, then restore the older Bundle and
 * prove authenticated catch-up pulls the later Event back into the replica.
 */
test('Workspace Event Bundle restore catches up accepted remote Events through normal sync', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept())

  await openNewRecordForm(page)
  await createForeignRecord(page, 'SOSP', '1234-56789')
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByText(/^Synced /)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  const dataManager = page.getByRole('button', { name: /Data Manager/ })
  await expect(dataManager).toBeVisible()
  await dataManager.click()

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
  await page.getByRole('button', { name: /Field Data/ }).click()
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)
  await createForeignRecord(page, 'WIWA', '9876-54321')
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByText(/^Synced /)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: /Data Manager/ }).click()
  await page.setInputFiles('input[accept=".json"]', file)
  await expect(page.getByText(/Restored 6 Events and protected 0 unsynced local Events/)).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: /Field Data/ }).click()
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await expect(entitySection(page, 'Banding Records')).toContainText('SOSP')
  await expect(entitySection(page, 'Banding Records')).toContainText('1234-56789')
  await expect(entitySection(page, 'Banding Records')).toContainText('WIWA')
  await expect(entitySection(page, 'Banding Records')).toContainText('9876-54321')
})
