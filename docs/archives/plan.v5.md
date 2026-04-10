# BirdNerd — Plan v5 (Archived)

Archived on completion of Phase 21.

See also: [../apps/field/product-specifications.md](../apps/field/product-specifications.md) | [../apps/field/tech-specifications.md](../apps/field/tech-specifications.md) | [../apps/field/ux-specifications.md](../apps/field/ux-specifications.md) | [../apps/field/entities.md](../apps/field/entities.md) | [../repo/monorepo.md](../repo/monorepo.md) | [../repo/deployment.md](../repo/deployment.md) | [plan.v4.md](plan.v4.md)

---

## Completed

Phases 1–21 complete. See [plan.v4](plan.v4.md) for phases 15–18 and [plan.v3](plan.v3.md) for phases 1–14.

| Phase | Summary |
|-------|---------|
| 1 | MVP Data Capture — offline PWA, species autocomplete, sessions + records in IndexedDB |
| 2 | Deploy & Polish — GitHub Pages, home screen, CSV export/import |
| 3 | Full Species List — 1,219 BBL species with sci names |
| 4 | Navigation Shell & Routing — 6-module home, placeholder pages |
| 5 | Code Tables & New Fields — Hallie's curated codes, all banding form fields |
| 6 | Location & Net Management — Location/Net CRUD, seed data |
| 7 | People & Roles — Person/Bander CRUD, seed known banders |
| 8 | Form UX Overhaul — section reorg, SearchableSelect, PageHeader |
| 9 | JSON Data Bundle — portable backup/restore, bundle schema v1→v2 |
| 10 | Session Form & Views — session CRUD, roster, cascade delete |
| 11 | Weather & Effort Tracking — weather fields, net soft-delete, SessionNetLog, net-hours |
| 12 | Validation (Soft Warnings) — 9 rules, inline warnings, never blocks save |
| 13a | Band Inventory — Band entity, bulk add, BandSearchSelect, atomic save |
| 13b | Recapture Fields — presentCondition, replacedBandNumber, auto-show on R |
| 14 | Photo Capture — PhotoRecord, camera input, share/download, bundle v4 |
| 14.5 | Cleanup & Fixes — sample data, PWA status bar, About page, plan v4 migration |
| 15a | Agency Export (IBP) — 49-column MAPS master list CSV, code mappings, multi-select scope |
| 15b | Agency Export (BBL) — 58-col new banding + 60-col recapture (R Upload) formats |
| 15.5 | Bug Fixes & Refactors — 9 bug fixes, DRY capture codes, shared theme.ts (13 files) |
| 16 | PWA & Deployment — prompt-based SW update banner, app version on About page |
| 17 | Error Boundary — class component, fallback UI, console logging |
| 18 | UI Components & Styles — Card/CardElevated components, card variant convention |
| 19 | Species Validation — band size + morphometric range warnings, disposition requires notes |
| 20 | Band History View — encounter timeline, foreign band entities, Band Inventory enhancements |
| 21 | Monorepo Migration — npm workspaces, OCR PWA scaffold, shared types package, docs restructure |

---

## Phase 20 — Band History View ✅

### 20a — Band Inventory Enhancements
- Filter by status, band size; sort by last-seen date (default) or band number
- Last seen date derived at load time from most recent record referencing the band
- Band row tap → Band History detail view

### 20b — Band History Detail View
- `apps/field/src/components/BandHistoryView.tsx` — encounter timeline component
- Header: band number, status/species/recap/last-seen chips
- Timeline sorted by date desc; each row links to its session
- Each row: date+location, speciesCode, bbpCode chip, sex, WRP, bander initials, photo/notes indicators
- Entry points: Band Inventory row + "View band history →" link in BirdRecordForm

### 20c — Foreign Band Entity Flow
- `BandStatus` expanded to include `'foreign'`
- `BandSearchSelect` creates a real Band entity (status: `foreign`) via two-step mini-form when user enters an unknown band number (≥4 chars, no exact match)
- Foreign bands appear in Band Inventory and have history timelines
- Legacy `{ kind: 'foreign'; bandNumber: string }` kept in BandSelection for existing records without Band entities
- DB: `by-band` index on records store (IndexedDB v8), `getRecordsByBand()` + `getAllRecords()` helpers
- Tests: 6 new db-band tests (112 total)

---

## Phase 21 — Monorepo Migration ✅

Goal: Establish npm workspace structure with minimal disruption, keep the current field app working at the same URL, and create the foundation for a future OCR PWA.

### 21a — Workspace Restructure (minimal disruption) ✅
- Convert to npm workspaces monorepo
- Structure: `apps/field/` (current PWA), `apps/ocr/` (future OCR PWA), `packages/shared/` (domain logic), reserve `tools/` as an extension point for future offline utilities
- Root `package.json` manages npm workspaces and shared scripts; each workspace (`apps/field`, `apps/ocr`, `packages/shared`) gets its own `package.json`
- Move the existing field app into `apps/field/` with no intended behavior changes
- Keep app-specific concerns local to each app: UI, IndexedDB wiring, PWA/service worker config, routing, app assets
- Configure `apps/field/` base path / asset paths for GitHub Pages deploy to `/birdnerd/` (same URL, no user disruption)
- Add root workspace scripts for dev, build, test, and deploy orchestration
- Preserve app-specific version display on the field About page after the move (version sourced from `apps/field/package.json`)
- Update root README for monorepo structure and workspace commands
- Add per-workspace README files for `apps/field/`, `apps/ocr/`, and `packages/shared/`
- Update docs/spec references that assume a single-app `src/`-only layout
- Verify: field PWA offline, service worker, and bundle behavior unchanged after the move
- All existing tests pass from new structure

### 21b — OCR App Skeleton ✅
- Create `apps/ocr/` as a separate Vite PWA with its own build and config
- Add a minimal placeholder UI that proves the app builds, runs, and can evolve independently
- Configure `apps/ocr/` base path / asset paths for GitHub Pages deploy to `/birdnerd/ocr/`
- Establish app-specific version injection/display pattern for the OCR app as well
- Add/update GitHub Actions workflow so both apps deploy correctly and the OCR app can be verified end to end on GitHub Pages
- Verify OCR app loads successfully from its production subpath
- Keep `/birdnerd/ocr/` excluded from the field app's Workbox navigation fallback so the field PWA does not hijack OCR routes on the shared GitHub Pages site

### 21c — Minimal Shared Package Bootstrap ✅
- Create `packages/shared/` as a tiny internal workspace package
- Move only one or two low-risk, pure modules into `packages/shared/` to establish the import path and packaging pattern
- Good first candidates: types, a small code table module, or other dependency-light domain constants
- Do not move DB, PWA, routing, or React/UI code in the first pass
- Defer broader shared-boundary decisions until OCR implementation reveals real reuse needs
- Extract persisted domain types into `@birdnerd/shared` and update the field app to import them via the workspace package

### 21d — Documentation Restructure ✅
- Treat current BirdNerd-focused specs as field-app docs rather than repo-wide docs
- Add a small repo-level docs layer for monorepo concerns such as workspace layout, deployment, and CI/CD
- Plan eventual field-doc homes under `docs/apps/field/`: product, tech, UX, and entities docs
- Start OCR docs lightweight; a README and/or small product doc is enough until the app takes shape
- Keep `docs/plan.md` repo-level and make phase scope explicit when work is repo-wide vs field-only vs OCR-only vs shared
- Use README files for orientation and commands; keep deep behavioral/design detail in specs
- Migrate docs in two passes: first clarify scope and structure with minimal rewriting, then move files/update links once the workspace layout is stable
- Preserve or update cross-links during the transition so plan/spec references do not silently break
- Move field app specs into `docs/apps/field/`, add repo-level docs under `docs/repo/`, and add a lightweight OCR doc stub under `docs/apps/ocr/`
