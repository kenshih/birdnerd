---
name: verifier-field
description: Runtime-verify changes to the BirdNerd field app (apps/field) in a real browser via the in-repo Playwright harness. Use when confirming a field-app UI/behavior change actually works — dropdowns, forms, views, band inventory, sessions.
---

# Verifier — field app

The field app's evidence-capture handle. Drives the real app in Chromium and
captures screenshots / DOM, so a reviewer can replay what you saw. Prefer this
over ad-hoc temp-dir Playwright setups.

## Launch facts

- Dev server: `npm run dev` (from repo root) → Vite at `http://localhost:5173/birdnerd/`.
  Base path is `/birdnerd/`, so navigate to `/birdnerd/`, not `/`.
- Routing is **in-memory state, not URLs** — you cannot deep-link. Navigate by
  clicking the Home module cards: `Session Data`, `Data Manager`,
  `Band Inventory`, `People`, `Project Locations`.
- A fresh browser context starts with an **empty IndexedDB**; the app seeds
  `apps/field/public/data/seed.json` on first launch (2 locations, 5 banders,
  10 nets, 0 sessions). So a location exists and the new-session **Create**
  button is enabled by default. To get a populated session with records, use
  Data Manager → load example data (`apps/field/public/data/example-data.json`).

## Handle: the Playwright harness (`apps/field/e2e/`)

- Run all smoke + regression specs: `npm run test:e2e` (root or field workspace).
  Config (`apps/field/playwright.config.ts`) auto-starts the dev server via
  `webServer` and `reuseExistingServer`, so it works against an already-running
  `npm run dev` too.
- Reusable navigation lives in `apps/field/e2e/helpers.ts`:
  `gotoHome`, `openNewRecordForm` (Home → session → New Bird Record),
  `openAddBandsForm` (Home → Band Inventory → Add Bands).

## Ad-hoc verification of a specific change

Drop a temporary spec in `apps/field/e2e/` (delete it after), import the helpers,
drive to the changed surface, and capture evidence:

```ts
import { test } from '@playwright/test'
import { openNewRecordForm } from './helpers'

test('verify <change>', async ({ page }) => {
  await openNewRecordForm(page)
  // dump a <select>'s options as evidence:
  const opts = await page.locator('select[name="skull"] option').allTextContents()
  console.log(JSON.stringify(opts, null, 2))
  await page.screenshot({ path: 'test-results/verify.png', fullPage: true })
})
```

Run with `npm run test:e2e` (or `npx playwright test e2e/<file>.spec.ts` in the
field workspace). `test-results/` and `playwright-report/` are gitignored.

## Notes

- The harness is intentionally smoke-level + code-table regression guards. It
  deliberately does not assert churning form content (field order, labels) while
  Phase 24 reorganizes the form — see `docs/plan.md`.
- Unit/logic tests are separate: `npm test` (vitest, `src/**/*.test.ts`). For
  verification, drive the app — don't just run the unit suite.
