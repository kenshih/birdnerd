# BirdNerd — Plan v4

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

## Phase 17 — Error Boundary

Goal: Catch runtime errors gracefully instead of white-screening the app.

- React error boundary component wrapping the app
- Friendly fallback UI with "Return to Home" action
- Logs error details to console for debugging

---

## Phase 18 — UI Components & Styles

Goal: Build on the shared theme by consolidating duplicated component patterns.

- Consolidate dropdown components: BandSearchSelect, SearchableSelect, SpeciesAutocomplete share dropdown/option styles and open/close/click-outside logic — extract a shared `Dropdown` primitive
- Normalize card variants: decide whether `cardStyle` (gray+border) and `cardElevatedStyle` (white+shadow) are intentional variants or drift, and document when to use each

---

## Phase 19 — Band History View

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
- Morphometrics × species range validation (wing, tail, tarsus, culmen, mass)
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
