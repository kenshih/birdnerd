import { test, expect } from '@playwright/test'
import { createSession, entityRow, entitySection, openSessionList } from './helpers'

/** Characterization of Phase 31's event-backed Session projection. */
test('empty state → create a MAPS Session → summary shows protocol and record count', async ({ page }) => {
  await openSessionList(page)
  await expect(entitySection(page, 'Sessions')).toContainText('None yet.')

  const date = await createSession(page, { protocol: 'MAPS', mapsPeriod: '3' })
  const row = entityRow(page, 'Sessions', date)
  await expect(row).toBeVisible()

  // Product-red until the event-backed Session summary restores the operational
  // protocol/MAPS-period and record-count context used in the field.
  await expect(row).toContainText('MAPS 3')
  await expect(row).toContainText('0 records')
})

test('lists Sessions newest-first and deactivates/reactivates the row', async ({ page }) => {
  await openSessionList(page)
  await createSession(page, { date: '2026-08-20', protocol: 'Non-MAPS' })
  await createSession(page, { date: '2026-08-21', protocol: 'MAPS' })

  const choices = await page.locator('label').filter({ hasText: 'Edit existing Session' }).locator('option').allTextContents()
  expect(choices[1]).toContain('2026-08-21')
  expect(choices[2]).toContain('2026-08-20')

  const newer = entityRow(page, 'Sessions', '2026-08-21')
  await newer.getByRole('button', { name: 'Deactivate', exact: true }).click()
  await expect(newer).toContainText('(inactive)')

  await newer.getByRole('button', { name: 'Reactivate', exact: true }).click()
  await expect(newer).not.toContainText('(inactive)')
})
