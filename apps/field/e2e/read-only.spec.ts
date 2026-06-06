import { test, expect, type Page } from '@playwright/test'
import { openNewRecordForm } from './helpers'

/**
 * Phase 24 commit 5: read-only record view (disabled full form) reached from the
 * session record list ("View") and from the Data Manager records browser.
 */
async function makeRecord(page: Page) {
  await page.locator('select[name="age"]').selectOption('1')
  await page.locator('select[name="sex"]').selectOption('F')
  await page.getByRole('button', { name: /Save Record/i }).first().click()
  // wait for the save to flush + the session list to re-render with the record
  await expect(page.getByRole('button', { name: /^View$/ }).first()).toBeVisible()
}

test('session "View" opens a record read-only (no save, fields disabled)', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  await page.getByRole('button', { name: /^View$/ }).first().click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Save Record/i })).toHaveCount(0)
  const age = page.locator('select[name="age"]')
  await expect(age).toBeDisabled()
  await expect(age).toHaveValue('1')
})

test('Data Manager Browse Records opens a record read-only', async ({ page }) => {
  await openNewRecordForm(page)
  await makeRecord(page)

  await page.goto('/birdnerd/')
  await page.getByText('Data Manager').first().click()
  await expect(page.getByText('Browse Records')).toBeVisible()

  await page.getByRole('button', { name: /—.*F/ }).first().click()
  await expect(page.getByRole('heading', { name: /View Record/i })).toBeVisible()
  await expect(page.locator('select[name="sex"]')).toBeDisabled()
})
