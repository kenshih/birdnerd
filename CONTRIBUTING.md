# Contributing to BirdNerd

## Development Setup

```bash
npm install
npm run fixtures:load -- operational-workspace  # required after a new local database; resets it and loads the two fixture Members
npm run dev          # starts/verifies local Supabase, then Field at localhost:5173
npm run dev:host     # expose the local Field server on the local network
npm run dev:local-google  # test Google OAuth against local Supabase only
npm run dev:ocr      # start the OCR app dev server
```

The default Field workflow requires Docker Desktop (or another Docker-compatible
runtime). `npm run dev` uses the checked-in Supabase CLI configuration and the
local Docker stack only. It reads that running stack's loopback URL and current
publishable key itself, so routine local development does **not** need an
`apps/field/.env.local` file.

`npm run dev` preserves the existing local database; it does not create the
fixture logins. Run `npm run fixtures:load -- operational-workspace` after
creating a new local database (including after deleting Docker volumes), or
whenever you want to replace local data with the disposable fixture. It creates
the **Fixture Admin** and **Fixture Contributor** accounts used by the signed-out
screen. The loader resets local data, so do not use it when you need to keep
your current local work.

Hosted-pilot testing is separate: put its settings only in the uncommitted
`apps/field/.env.pilot.local` file and use `npm run dev:pilot`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the field app dev server from the repo root |
| `npm run dev:host` | Expose the local Field dev server on the local network; Field still uses its loopback local Supabase target |
| `npm run dev:local-google` | Reload the CLI-local Supabase stack with the separate local Google OAuth client, then start Field against that loopback stack |
| `npm run dev:pilot` | Explicitly start Field against the hosted pilot configured in uncommitted `apps/field/.env.pilot.local` |
| `npm run dev:pilot:host` | Expose the explicit hosted-pilot server on the local network for iPhone/iPad testing |
| `npm run dev:ocr` | Start the OCR app dev server |
| `npm run dev:ocr:host` | Expose the OCR app on the local network |
| `npm run build` | TypeScript check + production build for the field app |
| `npm run build:ocr` | TypeScript check + production build for the OCR app |
| `npm run build:combined` | Build both apps and assemble a local Pages-style site folder |
| `npm run preview` | Preview the field app production build locally |
| `npm run preview:host` | Preview the production build on the local network |
| `npm run preview:ocr` | Preview the OCR production build locally |
| `npm run preview:ocr:host` | Preview the OCR production build on the local network |
| `npm run preview:combined` | Serve the assembled Pages-style site locally on port `4173` under `/birdnerd/` |
| `npm run test` | Run field app unit tests (Vitest) |
| `npm run lint` | Run ESLint for the field app |

## iPhone / iPad Testing (Without Deploying)

1. Make sure your Mac and phone are on the same WiFi
2. Put the hosted pilot's two publishable `VITE_SUPABASE_*` settings in the
   uncommitted `apps/field/.env.pilot.local` file, then run
   `npm run dev:pilot:host`
3. Copy the `Network:` URL from the terminal output
4. Open it in Safari on your iPhone
5. To install as an app: Share → Add to Home Screen

`npm run dev:host` exposes Vite but keeps the verified local Supabase endpoint
on loopback, which another device cannot use. Do not work around that with a
hosted URL in `.env.local`; use the explicit hosted-pilot command instead.

## Code Organization

- `apps/field/src/types/` — shared TypeScript interfaces (edit here first when adding fields)
- `apps/field/src/data/` — species list, code tables, bundle schema (update species here, verify codes against IBP)
  - `apps/field/src/data/bundle-schema.ts` — DataBundle TypeScript interface + `BUNDLE_VERSION` constant
  - `apps/field/public/data/seed.json` — seed data loaded at runtime on first launch
- `apps/field/src/db/` — IndexedDB read/write functions
- `apps/field/src/pages/` — top-level screen components
- `apps/field/src/components/` — reusable UI components

## Documentation & Changelog

- `docs/plan.md` is forward-looking and tracks current/future work
- `CHANGELOG.md` is backward-looking and records shipped changes
- Update `CHANGELOG.md` when a change is user-visible, bumps an app/package version, or meaningfully changes repo/deployment structure
- Group changelog entries under `Field`, `OCR`, `Shared`, or `Repo` as appropriate

## Human-AI Execution Process Summary

This process is designed for human-review clarity at every level.

Terms:

- [`plan.md`](./docs/plan.md): **Plan** of high-level **Phases**.
- **Phase** GitHub Issues are a live contract, authored when digging into phase planning. It consists of **Outcome** slices, decisions, evidence.
- One **outcome** normally one PR. Field release normally one **patch**. (outcome ~ patch)
- Learn during work. Split, defer, reorder, backlog.
- **Commits** in PR show meaningful steps inside **outcome**.
- **Phase** ends when remaining **outcomes** resolved, evidence checked, you approve closeout.

Human quick guide: this summary

- "Maintenance" note in [`plan.md`](./docs/plan.md)
- [`roadmap-maintenance.md`](./docs/repo/roadmap-maintenance.md)

Agent process guide:

- instructions: [AGENTS.md](./AGENTS.md)
- workflows (as skills): [`delivery-contract`](./.agents/skills/delivery-contract/), [`phase-delivery`](./.agents/skills/phase-delivery/), [`field-release`](./.agents/skills/field-release/)

## Adding a New Field

1. Add it to `BirdRecord` in `packages/shared/src/index.ts`
2. Add the input to `BirdRecordForm.tsx`
3. Add any code table to `apps/field/src/data/codes.ts` if needed

## Testing

```bash
npm test              # run tests in watch mode (re-runs on file changes)
npm --workspace @birdnerd/field exec vitest run
```

**Stack:** [Vitest](https://vitest.dev/) + [fake-indexeddb](https://github.com/nicedoc/fake-indexeddb) for IndexedDB integration tests.

**Conventions:**
- Test files live **next to the code they test**, named `*.test.ts` (e.g., `apps/field/src/utils/dataBundle.test.ts` tests `apps/field/src/utils/dataBundle.ts`)
- `apps/field/src/test/` is for **test infrastructure only** — setup files, shared fixtures, helpers. Not for test cases.

**Writing new tests:**
- Pure utility functions: test directly, no special setup needed
- Functions that use IndexedDB: call `resetDB()` and `indexedDB.deleteDatabase('birdnerd')` in `beforeEach` for isolation
- Mock `fetch` globally if your test triggers `getDB()` (which auto-seeds from seed.json on first call)

## Deployment (GitHub Pages)

```bash
npm run build
npm run build:ocr
npm run preview:combined
# GitHub Actions deploys a combined Pages artifact:
# field app at /birdnerd/
# OCR app at /birdnerd/ocr/
```

Note: The field app keeps the `/birdnerd/` base path in `apps/field/vite.config.ts`, and the OCR app uses `/birdnerd/ocr/` in `apps/ocr/vite.config.ts`.

Important: because both PWAs share one GitHub Pages site, the field app service worker scope overlaps the OCR path. Keep `/birdnerd/ocr/` excluded from the field app's Workbox navigation fallback, or the field app can hijack OCR navigations.
