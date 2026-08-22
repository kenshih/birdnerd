import { test, expect } from '@playwright/test'
import { fieldSelect, gotoHome, openNewRecordForm, openBandInventory } from './helpers'

/**
 * Smoke tests — the stable app shell + routing. These intentionally avoid
 * asserting churning form content (labels, field order, code values); that
 * keeps them green across the rest of Phase 24's form reorg. A white-screen
 * regression in any later commit will still trip these.
 */

test('app boots and Home shows the consolidated Field Data navigation', async ({ page }) => {
  await gotoHome(page)
  await expect(page.getByRole('button', { name: /Field Data/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Event Pipeline/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /About BirdNerd/ })).toBeVisible()
})

test('active identity stays visible and sign-out returns to the provider-neutral sign-in screen', async ({ page }) => {
  await gotoHome(page)
  await expect(page.getByLabel('Signed-in account')).toContainText('Playwright Admin · playwright-admin@example.com')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByText('Choose a sign-in method to continue.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue as Playwright Admin' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Field Data/ })).not.toBeVisible()

  await page.getByRole('button', { name: 'Continue as Playwright Admin' }).click()
  await expect(page.getByLabel('Signed-in account')).toContainText('Playwright Admin · playwright-admin@example.com')
})

test('can open a New Banding Record form from a new event-backed Session', async ({ page }) => {
  await openNewRecordForm(page)
  await expect(page.getByLabel('Species code', { exact: true })).toBeVisible()
  await expect(fieldSelect(page, 'Band selection')).toBeVisible()
})

test('Field Data Inventory receiving form renders', async ({ page }) => {
  await openBandInventory(page)
  await expect(page.getByLabel('Band number', { exact: true })).toBeVisible()
})
