# BirdNerd — Plan

See also: [product-specifications.md](product-specifications.md) | [tech-specifications.md](tech-specifications.md) | [ux-specifications.md](ux-specifications.md) | [entities.md](entities.md) | [archives/plan.v3.md](archives/plan.v3.md)

---

## Completed

Phases 1–14 complete. See [plan.v3 (archived)](archives/plan.v3.md) for details.

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
| 15.5 | Bug Fixes & Refactors — 9 bug fixes, DRY capture codes, shared theme.ts (13 files) |
| 16 | PWA & Deployment — prompt-based SW update banner, app version on About page |
| 17 | Error Boundary — class component, fallback UI, console logging |

---

## Phase 15 — Agency Export

Goal: Export in agency-specific formats. Built in-app (not separate tooling).

### 15a — IBP (MAPS Master List) ✅
- 49-column CSV matching Hallie's MASTER sheet layout
- IBP ↔ BBL dual columns for: Code, How Aged, How Sexed, Body Molt, FF Molt
- Code translation mappings: BBL 2-letter → IBP single-letter (How Aged, How Sexed), numeric → alpha (Age), Capture Code (1→N, 4→D, 8→L)
- Band number stripped of hyphen, capture time to numeric, booleans to Y/N
- Bander resolved via FK chain (bander → person → initials), location via session FK
- Agency Export section on Data Manager page with format picker + multi-select session scope
- Removed old CSV export/import buttons from Data Manager (kept per-session CSV in SessionView)
- `generateIBPRows()` exposed for testability
- Tests: 6 new (80 total)

### 15b — BBL Upload Format ✅
- BBL upload format (58 columns) for new bandings — filters to bbpCode `1` only
- BBL recapture upload format (60 columns) for recaptures — filters to bbpCode `R`, `F`, `4`, `5`, `6`, `8`
- `how_obtained` and `how_captured` hardcoded to "Mist net" for now (see backlog)
- `banded_leg` hardcoded to "R"
- Band numbers (including replaced/second) stripped of hyphens
- Body Molt / FF Molt converted to BBL Y/N
- Capture time exported both as numeric (for paste) and HH:MM
- Format picker on Data Manager page updated with all three options
- `generateBBLRows()` / `generateBBLRecapRows()` exposed for testability
- Agency export format transformations documented in tech spec § 3
- Tests: 5 new (85 total)

### 15c — CDFW Format (backlogged)
- TBD — requirements not yet documented, waiting on Hallie

---

## Phase 15.5 — Bug Fixes & Refactors ✅

- Fix: photo reference saved even when share fails (non-AbortError path)
- Fix: blood sample validation warns when status is missing, not only when wrong
- Fix: data bundle import confirmation now counts sessionNetLogs, bands, and photos
- Fix: editing session location refreshes nets for new location
- Fix: band status conflict validation includes capture code "N"
- Fix: agency export includes bbpCode "N" in BBL new bandings + IBP mapping
- Fix: deployed bands now selectable in BandSearchSelect for recaptures
- Fix: deleting a record reverts band to available (if no other records reference it)
- Fix: false "already deployed" warning suppressed when re-editing own band
- Refactor: `isNewBanding()` / `isRecapture()` helpers in codes.ts (DRY capture code checks)
- Refactor: `src/styles/theme.ts` — shared design tokens + common styles, updated 13 files

---

## Phase 16 — PWA & Deployment ✅

- Changed `registerType` from `autoUpdate` to `prompt` — new service worker waits for user action
- `useRegisterSW()` wired into App.tsx with `onNeedRefresh` callback
- UpdateBanner component: fixed bottom bar, "Update now" + "Later" (dismissable, reappears on next open)
- App version from package.json displayed on About page via Vite `define`
- App.tsx refactored from early returns to if/else so banner renders on every page

---

## Phase 17 — Error Boundary ✅

- `ErrorBoundary` class component wrapping app in App.tsx
- Fallback UI: error message, "Your data is safe" reassurance, "Return to Home" button (resets error state)
- Error details logged to console via `componentDidCatch`

---

## Phase 18 — UI Components & Styles

Goal: Build on the shared theme by consolidating duplicated component patterns.

### 18a — Card Variants ✅
- Document card variant convention: `cardStyle` (gray+border) = editable forms/detail views, `cardElevatedStyle` (white+shadow) = read-only/dashboard content
- Updated tech spec § 11 with the documented convention; removed resolved backlog item
- `<Card>` and `<CardElevated>` components wrapping the style objects; update all usages

### 18b — Vitest Browser Mode
- Add `@vitest/browser` for real-browser component testing
- Write component tests for BandSearchSelect, SearchableSelect, SpeciesAutocomplete covering: open/close, click-outside, type-to-filter, option selection, component-specific behavior (status chips, alpha↔common name, free text)
- Existing pure logic tests remain in Node (no migration needed)

### 18c — Dropdown Consolidation
- Extract shared `Dropdown` primitive from BandSearchSelect, SearchableSelect, SpeciesAutocomplete (dropdown/option styles, open/close/click-outside logic)
- Vitest Browser tests from 18b serve as safety net during refactor

---

## Phase 19 — Species Validation

Goal: Warn when band size or morphometric measurements don't match known ranges for the recorded species.

- `src/data/band-sizes.json` — ALPHA → string[] of valid band sizes (parsed from Validations.xlsx Tab 1)
- `src/data/measurement-ranges.json` — ALPHA → `{ weight, wing, tail }` each with `{ femaleMin, femaleMax, maleMin, maleMax }` (0 = unspecified, omitted)
- New validation rules in `src/utils/validation.ts`:
  - Band size mismatch: warn if selected band's size is not in the species' valid size list
  - Measurement out of range: warn if wing/bodyMass/tail is outside the expected range for the species + sex
  - Disposition requires notes: warn if Disposition is set but Notes is empty
  - Disposition × Status: warn if Disposition is set but Status does not indicate mortality (TBD: confirm which Status codes are mortality — need to check with Hallie)
- Sex unknown: warn only if value is outside *both* male and female ranges
- Bird Record Form: wire warnings inline below band size (via BandSearchSelect context) and below wing/bodyMass/tail fields
- Tests for all new rules

---

## Phase 20 — Band History View

Goal: Minimal encounter timeline for a band. From there, navigate to sessions.

Vision: start minimal, layer detail later.

- Band detail view: encounter timeline (date, species, station, capture code, bander)
- Each encounter links to its session
- Search by band number

**Open questions (TBD):**
- Entry points: Band Inventory row? Band number on a banding record? Both? Standalone search?
- Should timeline show band status changes (deployed → available → redeployed) or just encounters?
- Unbanded/foreign records have no band history — is this view purely for inventory bands?
- Read-only, or actions available (retire band, jump to edit record)?
- Relationship to UX spec § 2.2 step 3 ("show encounter history table" on recapture) — same view inline, or link to this page?
- How much band metadata to show (current status, deployment date, size, type, prefix)?

---

## Phase 21 — Monorepo Migration

Goal: Restructure for code sharing across multiple apps without bloating the field PWA.

- Convert to npm workspaces monorepo
- Structure: `apps/field/` (current PWA), `packages/shared/` (domain logic)
- Extract shared code into `packages/shared/`: types, validation, codes, species, CSV/export formats, agency export
- Each app gets its own Vite config, build, and deploy
- GitHub Pages deploys `apps/field/` to `/birdnerd/` (same URL, no user disruption)
- Verify: PWA offline, service worker, bundle size unchanged for field app
- All existing tests pass from new structure

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
