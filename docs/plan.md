# BirdNerd — Plan

See also: [product-specifications.md](product-specifications.md) | [tech-specifications.md](tech-specifications.md) | [ux-specifications.md](ux-specifications.md) | [entities.md](entities.md) | [archives/plan.v4.md](archives/plan.v4.md)

---

## Completed

Phases 1–20 complete. See [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14.

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

## Phase 21 — Monorepo Migration

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

### 21c — Minimal Shared Package Bootstrap
- Create `packages/shared/` as a tiny internal workspace package
- Move only one or two low-risk, pure modules into `packages/shared/` to establish the import path and packaging pattern
- Good first candidates: types, a small code table module, or other dependency-light domain constants
- Do not move DB, PWA, routing, or React/UI code in the first pass
- Defer broader shared-boundary decisions until OCR implementation reveals real reuse needs

### 21d — Documentation Restructure
- Treat current BirdNerd-focused specs as field-app docs rather than repo-wide docs
- Add a small repo-level docs layer for monorepo concerns such as workspace layout, deployment, and CI/CD
- Plan eventual field-doc homes under `docs/apps/field/`: product, tech, UX, and entities docs
- Start OCR docs lightweight; a README and/or small product doc is enough until the app takes shape
- Keep `docs/plan.md` repo-level and make phase scope explicit when work is repo-wide vs field-only vs OCR-only vs shared
- Use README files for orientation and commands; keep deep behavioral/design detail in specs
- Migrate docs in two passes: first clarify scope and structure with minimal rewriting, then move files/update links once the workspace layout is stable
- Preserve or update cross-links during the transition so plan/spec references do not silently break

---

## Phase 22 — Bandsheet OCR

Goal: Scan handwritten/printed bandsheets and import records into BirdNerd.

- New app: `apps/ocr/` — separate Vite build, not part of the field PWA
- Tesseract.js (WASM) for text recognition
- Imports `packages/shared/` for types, validation, code tables, species list
- Deploys to `/birdnerd/ocr/` (or separate path)

**Open questions (TBD):**
- Input: handwritten bandsheets, printed sheets, or both?
- Output: JSON data bundle? Direct IndexedDB import? CSV?
- Field mapping: how to map OCR'd regions to BandingRecord fields?
- Correction UX: review/edit extracted data before import?
- Camera vs file upload: scan live or upload photos?
- Accuracy expectations: which fields are reliably OCR-able vs. need human review?
- Does OCR app need offline support, or is it a desk/office tool only?

---

## Backlog (unordered — to be phased later)

**Media**
- Photo Log view: browse PhotoRecords grouped by session, filter by species/date
- Speech-to-text (STT) input for field entry

**Code Quality**
- SessionView decomposition: ~800 lines with mixed concerns (data loading, form state, rendering) — split into sub-components or custom hooks
- DB-layer band lifecycle tests: no tests for band status transitions (deploy, revert on delete, multi-record reference check)
- FK integrity checks: deleting a location/person doesn't warn about referencing sessions/records
- App.tsx routing: replace if/else chain with a route map or lightweight router as view count grows

**Dev tooling**
- E2E UX tests (Playwright): session CRUD, banding record flow, offline export/import round-trip
- Storybook for component-level UX checks (optional)
- Vitest Browser Mode (`@vitest/browser`): component tests for BandSearchSelect, SearchableSelect, SpeciesAutocomplete (open/close, click-outside, type-to-filter, selection); prerequisite for dropdown consolidation
- Dropdown Consolidation: extract shared `Dropdown` primitive from BandSearchSelect, SearchableSelect, SpeciesAutocomplete; do after browser tests are in place as safety net

**Advanced Validation**
- Validation override mechanism: user acknowledges warning, auto-note generated
- Status × Disposition cross-validation
- Cross-field self-validation (contradicting data in multiple categories)
- Sex × How Sexed/How Aged conflict: EG (Egg in Oviduct), BP (Brood Patch) are female-only; CL (Cloacal Protuberance), IC (Incomplete CP) are male-only. Warn when these contradict the selected sex.
- Season × species × age/sex/molt consistency
- New/Recapture/Unbanded selection driving which codes are valid
- CSV import/export round-trip tests
- IBP → BBL code translation tests

**Band Inventory Advanced**
- Editing a record to switch bands (or to unbanded/foreign) does not revert the previous band to available. Low severity (rare correction scenario), complex fix (must check if other records still reference the old band before reverting).
- Auxiliary markers (colored bands, 1-2 letters + 1-2 numbers)
- Band replacement tracking (old band → new band, linked history)
- Hummingbird band prefix → alpha mapping
- `how_obtained` field: currently hardcoded to "mist net" in export. Needs per-record or per-session config when generalizing to non-MAPS protocols or stations with varied capture methods.
- Confirm band types with Hallie (Standard, Buffy, Giant, Lockout)

**Special Forms**
- Empidonax flycatcher supplemental datasheet
- Selasphorus hummingbird supplemental datasheet
- Other addendum datasheets (attachable to records, exportable)

**Toolkit Expansion**
- Standalone band code lookup tool
- Scientific name / definition lookup
- Lighter "in-the-field" utility mode

**Schema Migration Framework**
- Numbered migration runner for IndexedDB
- Retroactively capture schema changes as migrations
- Write each migration with a corresponding Postgres migration (for Supabase cutover)

**Cloud Sync & Auth**
- Multi-tenant data model: Organization as top-level, User entity, row-level security
- Supabase integration: Postgres backend, Auth, IndexedDB ↔ Supabase sync
- Consider when: multiple stations sharing data, multiple concurrent users, or data exceeds ~100K records
- **ID migration:** Replace current numeric/short IDs with time-sortable UUIDs (UUIDv7) to support multi-org without collisions. UUIDv7 is timestamp-prefixed so IDs sort chronologically (unlike random UUIDv4), which keeps IndexedDB range queries and Postgres index performance sane. Enables shared data store OR sharded-per-org with safe merges. Valuable even without cloud sync — unique IDs allow assembling data across MAPS orgs later. Likely implementation: `uuid` npm package (`v7()` method), one-time IndexedDB migration to remap existing IDs + FK references.

**External Data Integration**
- NOAA weather API: auto-populate session weather fields from station coordinates + date/time (similar approach to openhamclock). Reduces manual entry, improves data consistency.

**Effort & Reporting**
- Volunteer/person-hours tracking

**Platform**
- Color band resighting data collection
- Admin dashboard
- Protocol-specific forms and validations
- Per-net/trap/nest metadata
- Rehab records: capture location vs release location

**Branding**
- Vector art from bird drawings/photos for icons, splash, UI

**Open Decisions** — See [product-specifications.md § 8](product-specifications.md#8-open-decisions--todos) for the canonical list.
