import { expect, test } from '@playwright/test'

import { entitySection, fieldSelect, openNewRecordForm } from './helpers'

test('record feedback is inline, associated with BP, and does not block saving', async ({ page }) => {
  await openNewRecordForm(page)
  const save = page.getByRole('button', { name: 'Save offline', exact: true })

  await fieldSelect(page, 'Sex').selectOption('M')
  await fieldSelect(page, 'BP').selectOption('3')

  const feedback = page.getByRole('status').filter({ hasText: 'Sex=M conflicts with Brood Patch 3/4' })
  await expect(feedback).toBeVisible()
  await expect(feedback).toHaveAttribute('id', 'record-validation-bp')
  await expect(fieldSelect(page, 'BP')).toHaveAttribute('aria-describedby', 'record-validation-bp')
  await expect(save).toBeEnabled()

  await fieldSelect(page, 'BP').selectOption('0')
  await expect(feedback).toHaveCount(0)

  await fieldSelect(page, 'BP').selectOption('3')
  await save.click()
  await expect(entitySection(page, 'Banding Records').locator(':scope > div')).toHaveCount(1)
})
