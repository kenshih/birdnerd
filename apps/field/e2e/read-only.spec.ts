import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { chooseFirstSession, deployBand, editFirstRecord, entityRow, entitySection, fieldSelect, openNewRecordForm } from './helpers'

/** Read-only record inspection through Field Data and the Event-backed Data Manager. */
async function makeRecord(page: Page) {
  await fieldSelect(page, 'Age').selectOption('1')
  await fieldSelect(page, 'Sex').selectOption('F')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Banding Records')).not.toContainText('None yet.')
}

test('session "View" opens a record read-only (no save, fields disabled)', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  const view = entitySection(page, 'Banding Records').getByRole('button', { name: 'View', exact: true })
  await expect(view).toBeVisible()
  await view.click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toHaveCount(0)
  const age = fieldSelect(page, 'Age')
  await expect(age).toBeDisabled()
  await expect(age).toHaveValue('1')
})

test('Data Manager Browse Records opens a projected Record read-only', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  await page.goto('/birdnerd/')
  await page.getByText('Data Manager').first().click()
  await expect(page.getByText('Browse Records')).toBeVisible()
  await expect(page.getByRole('heading', { name: '2026-08-21', exact: true })).toBeVisible()
  await expect(page.getByText('Active Record', { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 667 })
  const view = page.getByRole('button', { name: 'View', exact: true })
  await expect(view).toBeVisible()
  expect((await view.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await page.setViewportSize({ width: 768, height: 1024 })
  expect((await view.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await view.click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(fieldSelect(page, 'Sex')).toBeDisabled()
  await expect(fieldSelect(page, 'Sex')).toHaveValue('F')
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toHaveCount(0)
  const close = page.getByRole('button', { name: 'Close view', exact: true })
  expect((await close.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await close.click()
  await expect(page.getByRole('heading', { name: 'Browse Records', exact: true })).toBeVisible()
})

test('Data Manager inspector preserves an inactive managed Band', async ({ page }) => {
  const band = await deployBand(page)
  await page.getByRole('button', { name: 'inventory', exact: true }).click()
  await entityRow(page, 'Inventory', band).getByRole('button', { name: 'Deactivate', exact: true }).click()

  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByText('Data Manager').first().click()
  await page.getByRole('button', { name: 'View', exact: true }).click()

  const managedBand = fieldSelect(page, 'Managed Band')
  await expect(managedBand).toBeDisabled()
  await expect(managedBand.locator('option:checked')).toContainText(band)
  await expect(managedBand.locator('option:checked')).toContainText('inactive Band')
})

test('Data Manager preserves a raw v1 Band number as historical and read-only', async ({ page }) => {
  await page.goto('/birdnerd/?e2eFixture=legacy-band')
  await expect(page.getByRole('heading', { name: 'BirdNerd', exact: true })).toBeVisible()
  await page.getByText('Data Manager').first().click()

  await expect(page.getByText('Historical Band (unresolved) — 1154-81501')).toBeVisible()
  await page.getByRole('button', { name: 'View', exact: true }).click()
  await expect(fieldSelect(page, 'Band selection')).toHaveValue('legacy')
  const historicNumber = page.getByLabel('Historical band number', { exact: true })
  await expect(historicNumber).toBeDisabled()
  await expect(historicNumber).toHaveValue('1154-81501')
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toHaveCount(0)
})

test('Data Manager retains an unresolved managed Band number snapshot', async ({ page }) => {
  await page.goto('/birdnerd/?e2eFixture=unresolved-managed-band')
  await expect(page.getByRole('heading', { name: 'BirdNerd', exact: true })).toBeVisible()
  await page.getByText('Data Manager').first().click()

  const expected = 'Unresolved managed Band — 1154-81502 (ID: 018f8c7b-0000-7000-8000-000000000031)'
  await expect(page.getByText(expected)).toBeVisible()
  await page.getByRole('button', { name: 'View', exact: true }).click()
  const managedBand = fieldSelect(page, 'Managed Band')
  await expect(managedBand).toBeDisabled()
  await expect(managedBand.locator('option:checked')).toContainText(expected)
})

test('an unrelated correction preserves a raw v1 Band number', async ({ page }) => {
  await page.goto('/birdnerd/?e2eFixture=legacy-band')
  await expect(page.getByRole('heading', { name: 'BirdNerd', exact: true })).toBeVisible()
  await page.getByText('Field Data').first().click()
  await expect(page.getByRole('heading', { name: 'Field Data', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)
  await editFirstRecord(page)

  await expect(fieldSelect(page, 'Band selection')).toHaveValue('legacy')
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toBeEnabled()
  await page.getByText('Notes', { exact: true }).locator('..').locator('textarea').fill('Corrected historical note')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New Banding Record', exact: true })).toBeVisible()
  await expect(entitySection(page, 'Banding Records')).toContainText('Historical Band (unresolved) — 1154-81501')
  await editFirstRecord(page)
  await expect(page.getByText('Notes', { exact: true }).locator('..').locator('textarea')).toHaveValue('Corrected historical note')

  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByText('Data Manager').first().click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Event Bundle' }).click()
  const path = await (await downloadPromise).path()
  if (!path) throw new Error('Playwright did not retain the downloaded Event Bundle.')
  const bundle = JSON.parse(readFileSync(path, 'utf8'))
  const amendment = bundle.events.findLast((event: { event_type: string }) => event.event_type === 'banding-record.fields-amended')
  expect(amendment?.payload.fields).toEqual({ notes: 'Corrected historical note' })
})
