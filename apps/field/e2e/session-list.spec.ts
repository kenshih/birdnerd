import { test, expect, type Page } from '@playwright/test'
import { openSessionList } from './helpers'

/**
 * Characterization tests for the Banding Sessions list (SessionList.tsx) — a
 * 440-line page with no prior direct coverage. These pin current observable
 * behavior (empty state, the MAPS-period conditional field, the summary line,
 * newest-first ordering, row delete) so a later cleanup refactor of this page
 * can't silently regress what the bander sees. Not asserting styling/internals.
 */

/** The protocol <select> is the only one carrying the unique 'Burrowing Owl Banding' option. */
function protocolSelect(page: Page) {
  return page.locator('select', { has: page.locator('option', { hasText: 'Burrowing Owl Banding' }) })
}

/** Create a session with the given protocol; lands on the session view afterward. */
async function createSession(page: Page, protocol: 'MAPS' | 'Non-MAPS') {
  await openSessionList(page)
  await page.getByRole('button', { name: /New Session/i }).click()
  await protocolSelect(page).selectOption(protocol)
  await page.getByRole('button', { name: /^Create$/ }).click()
  await expect(page.getByRole('button', { name: /New Bird Record/i })).toBeVisible()
}

test('empty state → create a MAPS session → summary row shows protocol + record count', async ({ page }) => {
  await openSessionList(page)
  await expect(page.getByText(/No sessions yet/)).toBeVisible()

  await page.getByRole('button', { name: /New Session/i }).click()
  // MAPS Period is revealed only after choosing the MAPS protocol
  await expect(page.getByText(/MAPS Period/)).toHaveCount(0)
  await protocolSelect(page).selectOption('MAPS')
  await expect(page.getByText(/MAPS Period/)).toBeVisible()
  await page.getByRole('spinbutton').fill('3') // only visible number input (weather is collapsed)
  await page.getByRole('button', { name: /^Create$/ }).click()

  // Create saves then navigates into the new session — wait for that landing
  // before leaving, so the async save isn't interrupted by the next navigation.
  await expect(page.getByRole('button', { name: /New Bird Record/i })).toBeVisible()
  await openSessionList(page)
  await expect(page.getByText(/No sessions yet/)).toHaveCount(0)
  await expect(page.getByText(/MAPS 3/)).toBeVisible()
  await expect(page.getByText(/0 records/)).toBeVisible()
})

test('lists sessions newest-first and deletes a session via the row control', async ({ page }) => {
  await createSession(page, 'Non-MAPS') // older
  await createSession(page, 'MAPS')     // newer

  await openSessionList(page)
  const rows = page.locator('ul li')
  await expect(rows).toHaveCount(2)
  // newest (MAPS) sorts to the top; older (Non-MAPS) below
  await expect(rows.first()).not.toContainText('Non-MAPS')
  await expect(rows.first()).toContainText('MAPS')
  await expect(rows.nth(1)).toContainText('Non-MAPS')

  // delete the newest row (confirm dialog auto-accepted) → one session remains
  page.on('dialog', d => { void d.accept() })
  await rows.first().getByTitle('Delete session').click()
  await expect(page.locator('ul li')).toHaveCount(1)
  await expect(page.locator('ul li').first()).toContainText('Non-MAPS')
})
