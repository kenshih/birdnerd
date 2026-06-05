import { test, expect } from '@playwright/test'
import { gotoHome, openNewRecordForm, openAddBandsForm } from './helpers'

/**
 * Smoke tests — the stable app shell + routing. These intentionally avoid
 * asserting churning form content (labels, field order, code values); that
 * keeps them green across the rest of Phase 24's form reorg. A white-screen
 * regression in any later commit will still trip these.
 */

test('app boots and Home shows the module navigation', async ({ page }) => {
  await gotoHome(page)
  for (const card of ['Session Data', 'Data Manager', 'Band Inventory', 'People', 'Project Locations']) {
    await expect(page.getByText(card)).toBeVisible()
  }
})

test('can open a New Bird Record form from a new session', async ({ page }) => {
  await openNewRecordForm(page)
  await expect(page.getByText('Band Number')).toBeVisible()
})

test('Band Inventory add-bands form renders', async ({ page }) => {
  await openAddBandsForm(page)
  await expect(page.getByText('Band Size')).toBeVisible()
})
