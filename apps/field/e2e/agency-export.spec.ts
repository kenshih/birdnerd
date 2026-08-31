import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import {
  chooseFirstSession,
  createSession,
  entitySection,
  fieldSelect,
  openFieldTab,
  receiveBand,
  selectManagedBand,
} from './helpers'

test('an Admin configures a Station agency code and downloads an Event-backed BBL export', async ({ page }) => {
  await openFieldTab(page, 'configuration')
  const stationForm = page.getByRole('heading', { name: 'Station', exact: true }).locator('..')
  await stationForm.getByLabel('Name', { exact: true }).fill('Galindo Creek')
  await stationForm.getByLabel('Agency code', { exact: true }).fill('GCFS')
  await stationForm.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Stations')).toContainText('GCFS — Galindo Creek')

  await page.getByRole('button', { name: 'sessions', exact: true }).click()
  const stationSelect = fieldSelect(page, 'Station')
  const stationId = await stationSelect.locator('option').filter({ hasText: 'Galindo Creek' }).getAttribute('value')
  if (!stationId) throw new Error('Configured Station was not available to the Session form.')
  await stationSelect.selectOption(stationId)
  await expect(stationSelect).toHaveValue(stationId)
  await createSession(page)

  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  await receiveBand(page, '1154-81501')
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)
  await selectManagedBand(page, '1154-81501')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()

  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByRole('button', { name: /Data Manager/ }).click()
  await expect(page.getByRole('heading', { name: 'Agency CSV export', exact: true })).toBeVisible()
  await page.getByLabel('BBL upload (new bandings)', { exact: true }).check()
  const sessionScope = page.getByLabel(/GCFS.*2026/)
  await sessionScope.uncheck()
  await expect(page.getByRole('button', { name: '↓ Export 0 active Records', exact: true })).toBeDisabled()
  await sessionScope.check()
  await page.getByLabel('BBL recapture upload', { exact: true }).check()
  await expect(page.getByRole('button', { name: '↓ Export 0 active Records', exact: true })).toBeDisabled()
  await page.getByLabel('BBL upload (new bandings)', { exact: true }).check()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '↓ Export 1 active Record', exact: true }).click()
  const path = await (await download).path()
  if (!path) throw new Error('Playwright did not retain the agency CSV download.')
  expect(readFileSync(path, 'utf8')).toContain(',GCFS,')
})
