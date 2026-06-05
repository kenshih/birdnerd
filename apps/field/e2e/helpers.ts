import { type Page, expect } from '@playwright/test'

/**
 * Centralized navigation so Phase 24's form/view reorg only breaks one place.
 * Each fresh Playwright context starts with an empty IndexedDB; the app seeds
 * public/data/seed.json on first launch (2 locations, 5 banders, 10 nets), so
 * a location exists and the session "Create" button is enabled by default.
 */

export async function gotoHome(page: Page) {
  await page.goto('/birdnerd/')
  await expect(page.getByText('Session Data')).toBeVisible()
}

/** Home → Session Data → New Session (auto-located) → New Bird Record form. */
export async function openNewRecordForm(page: Page) {
  await gotoHome(page)
  await page.getByText('Session Data').first().click()
  await page.getByRole('button', { name: /New Session/i }).click()
  await page.getByRole('button', { name: /^Create$/ }).click()
  await page.getByRole('button', { name: /New Bird Record/i }).click()
  await expect(page.getByRole('button', { name: /Save Record/i }).first()).toBeVisible()
}

/** Home → Band Inventory → Add Bands form. */
export async function openAddBandsForm(page: Page) {
  await gotoHome(page)
  await page.getByText('Band Inventory').first().click()
  await page.getByRole('button', { name: /Add Bands/i }).click()
  await expect(page.getByText('— Select size —')).toBeAttached()
}
