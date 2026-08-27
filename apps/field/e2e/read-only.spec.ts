import { test, expect, type Page } from '@playwright/test'
import { entitySection, fieldSelect, openNewRecordForm } from './helpers'

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

  await page.getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(fieldSelect(page, 'Sex')).toBeDisabled()
  await expect(fieldSelect(page, 'Sex')).toHaveValue('F')
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close view', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Browse Records', exact: true })).toBeVisible()
})
