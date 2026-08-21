import { test, expect, type Page } from '@playwright/test'
import { entitySection, fieldSelect, openNewRecordForm } from './helpers'

/**
 * Phase 24 commit 5: read-only record view (disabled full form) reached from the
 * session record list ("View") and from the Data Manager records browser.
 */
async function makeRecord(page: Page) {
  await fieldSelect(page, 'Age').selectOption('1')
  await fieldSelect(page, 'Sex').selectOption('F')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Banding Records')).not.toContainText('None yet.')
}

test('session "View" opens a record read-only (no save, fields disabled)', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  // Product-red: Phase 31 currently exposes Correct/Deactivate but no record
  // inspection path from the immutable projection.
  const view = entitySection(page, 'Banding Records').getByRole('button', { name: 'View', exact: true })
  await expect(view).toBeVisible()
  await view.click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save offline', exact: true })).toHaveCount(0)
  const age = fieldSelect(page, 'Age')
  await expect(age).toBeDisabled()
  await expect(age).toHaveValue('1')
})

test.skip('Data Manager Browse Records opens a record read-only (Phase 33)', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  await page.goto('/birdnerd/')
  await page.getByText('Data Manager').first().click()
  await expect(page.getByText('Browse Records')).toBeVisible()

  await page.getByRole('button', { name: /—.*F/ }).first().click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(fieldSelect(page, 'Sex')).toBeDisabled()
})
