import { test, expect } from '@playwright/test'
import { openNewRecordForm } from './helpers'

/**
 * Phase 24 commit 3: capture-time quick-select (standard net-check slots).
 * The Identity adjacency (Age/How Aged, Sex/How Sexed) and Condition reorder are
 * pure layout — verified visually, not asserted here (order assertions are brittle).
 */
test('capture time offers a net-check quick-select with time slots', async ({ page }) => {
  await openNewRecordForm(page)
  const captureTime = page.getByLabel('Capture Time', { exact: true })
  await expect(captureTime).toBeVisible()
  // Product-red while the operational form has regressed to a raw time input.
  await expect(captureTime).toHaveJSProperty('tagName', 'SELECT')
  const opts = await captureTime.locator('option').allTextContents()
  expect(opts[0]).toBe('—')
  expect(opts.some(o => /^\d{2}:\d{2}$/.test(o))).toBe(true)
})
