import { type Locator, type Page, expect } from '@playwright/test'

/** Phase 31's authenticated, event-backed Field surface. */
export async function gotoHome(page: Page) {
  await page.goto('/birdnerd/')
  await expect(page.getByRole('heading', { name: 'BirdNerd', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Field Data/ })).toBeVisible()
}

/** Home → Field Data. */
export async function openFieldData(page: Page) {
  await gotoHome(page)
  await page.getByRole('button', { name: /Field Data/ }).click()
  await expect(page.getByRole('heading', { name: 'Field Data', exact: true })).toBeVisible()
  await expect(page.getByText('Playwright Field Workspace')).toBeVisible()
}

/** Field Data → a named operational tab. */
export async function openFieldTab(
  page: Page,
  tab: 'sessions' | 'records' | 'inventory' | 'configuration',
) {
  await openFieldData(page)
  await page.getByRole('button', { name: tab, exact: true }).click()
}

/** Home → Field Data → Sessions. */
export async function openSessionList(page: Page) {
  await openFieldTab(page, 'sessions')
  await expect(page.getByRole('heading', { name: 'New Session', exact: true })).toBeVisible()
}

/** Create an event-backed Session and wait until its projection is visible. */
export async function createSession(
  page: Page,
  fields: { date?: string; protocol?: string; mapsPeriod?: string } = {},
) {
  const date = fields.date ?? '2026-08-21'
  await page.getByLabel('Date', { exact: true }).fill(date)
  if (fields.protocol) await fieldSelect(page, 'Protocol').selectOption(fields.protocol)
  if (fields.mapsPeriod) await page.getByLabel('MAPS Period', { exact: true }).fill(fields.mapsPeriod)
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Sessions')).toContainText(date)
  return date
}

/** Home → Field Data → create Session → New Banding Record form. */
export async function openNewRecordForm(page: Page) {
  await openSessionList(page)
  await createSession(page)
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)
  await expect(page.getByRole('heading', { name: 'New Banding Record', exact: true })).toBeVisible()
}

/** Select the first active Session from the Records tab. */
export async function chooseFirstSession(page: Page) {
  const session = page.locator('select').filter({ has: page.locator('option', { hasText: 'Choose a Session' }) })
  await expect(session.locator('option')).not.toHaveCount(1)
  await session.selectOption({ index: 1 })
}

/** Home → Field Data → Inventory. */
export async function openBandInventory(page: Page) {
  await openFieldTab(page, 'inventory')
  await expect(page.getByRole('heading', { name: 'Receive Band', exact: true })).toBeVisible()
}

/** Receive one Band through the current immutable Event flow. */
export async function receiveBand(page: Page, bandNumber: string) {
  await page.getByLabel('Band number', { exact: true }).fill(bandNumber)
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Inventory')).toContainText(bandNumber)
}

/** Receive a Band, create a Session, and leave its new-record form open. */
export async function openRecordFormWithBand(page: Page, bandNumber = '1154-00001') {
  await openBandInventory(page)
  await receiveBand(page, bandNumber)
  await page.getByRole('button', { name: 'sessions', exact: true }).click()
  await createSession(page)
  await page.getByRole('button', { name: 'records', exact: true }).click()
  await chooseFirstSession(page)
  return bandNumber
}

/** Select a managed inventory Band in the event-backed Record form. */
export async function selectManagedBand(page: Page, bandNumber: string) {
  await fieldSelect(page, 'Band selection').selectOption('managed')
  const managedBand = fieldSelect(page, 'Managed Band')
  const value = await managedBand.locator('option').filter({ hasText: bandNumber }).getAttribute('value')
  if (!value) throw new Error(`Managed Band option ${bandNumber} has no value.`)
  await managedBand.selectOption(value)
}

/** Create a foreign-band Record in the currently selected Session. */
export async function createForeignRecord(page: Page, species: string, bandNumber: string) {
  await page.getByLabel('Species code', { exact: true }).fill(species)
  await fieldSelect(page, 'Band selection').selectOption('foreign')
  await page.getByLabel('Foreign band number', { exact: true }).fill(bandNumber)
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Banding Records')).toContainText(species)
  await expect(entitySection(page, 'Banding Records')).toContainText(bandNumber)
}

/** Add a managed Band and make a new deployment Record on it. */
export async function deployBand(page: Page, bandNumber = '1154-00001') {
  await openRecordFormWithBand(page, bandNumber)
  await selectManagedBand(page, bandNumber)
  await expect(fieldSelect(page, 'Capture code')).toHaveValue('1')
  await page.getByRole('button', { name: 'Save offline', exact: true }).click()
  await expect(entitySection(page, 'Banding Records')).toContainText(bandNumber)
  return bandNumber
}

/** Start amending the first projected Banding Record. */
export async function editFirstRecord(page: Page) {
  const record = page.locator('label').filter({ hasText: 'Edit existing Record' }).locator('select')
  await record.selectOption({ index: 1 })
  await expect(page.getByRole('heading', { name: 'Amend Banding Record', exact: true })).toBeVisible()
}

/** A projected operational-entity section and one of its direct entity rows. */
export function entitySection(page: Page, title: string): Locator {
  return page.getByRole('heading', { name: title, exact: true }).locator('..')
}

export function entityRow(page: Page, title: string, detail: string): Locator {
  return entitySection(page, title).locator(':scope > div').filter({ hasText: detail })
}

/** SelectField renders a caption span inside a wrapping label. */
export function fieldSelect(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator('..').locator('select')
}

/**
 * A rich Phase 31 Banding Record fixture. Keys are accessible Field labels,
 * keeping this guard independent of the retired react-hook-form `name`s.
 */
export const richRecord = {
  selects: {
    'Capture code': '1', Age: '1', Sex: 'F', 'How Aged': 'SK', 'How Sexed': 'CC',
    Skull: '6', CP: '2', BP: '3', Fat: '4',
    'Body Molt': '2', 'FF Molt': 'S', 'FF Wear': '3', 'Juv Body Plumage': '1',
    'P Covs': 'F', 'G Covs': 'B', Alula: 'F', PP: 'R', SS: 'M', Tert: 'L',
    Rec: 'N', 'Body Plum': 'J', 'Non-Feather': 'U', Status: '300', Disposition: 'X',
  } as Record<string, string>,
  inputs: {
    'Capture Time': '07:30', 'Release Time': '08:00',
    'Wing (mm)': '67', 'Tail (mm)': '55', 'Tarsus (mm)': '22.5',
    'Exp. Culmen (mm)': '11.2', 'Body Mass (g)': '18.3',
  } as Record<string, string>,
  notes: 'round-trip fixture',
  checkboxes: ['Feather Pull', 'Blood Sample'],
}

/** Fill the open New Banding Record form with the rich fixture. */
export async function fillRichRecord(page: Page) {
  for (const [label, value] of Object.entries(richRecord.selects)) {
    await fieldSelect(page, label).selectOption(value)
  }
  for (const [label, value] of Object.entries(richRecord.inputs)) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
  await page.getByText('Notes', { exact: true }).locator('..').locator('textarea').fill(richRecord.notes)
  for (const label of richRecord.checkboxes) {
    await page.getByLabel(label, { exact: true }).check()
  }
}

/** Assert the rich fixture's values are present after an Event amendment load. */
export async function assertRichRecord(page: Page) {
  for (const [label, value] of Object.entries(richRecord.selects)) {
    await expect(fieldSelect(page, label)).toHaveValue(value)
  }
  for (const [label, value] of Object.entries(richRecord.inputs)) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
  }
  await expect(page.getByText('Notes', { exact: true }).locator('..').locator('textarea')).toHaveValue(richRecord.notes)
  for (const label of richRecord.checkboxes) {
    await expect(page.getByLabel(label, { exact: true })).toBeChecked()
  }
}
