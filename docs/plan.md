# BirdNerd — Plan

See also: [product-specifications.md](product-specifications.md) | [tech-specifications.md](tech-specifications.md) | [ux-specifications.md](ux-specifications.md) | [entities.md](entities.md) | [archives/plan.v4.md](archives/plan.v4.md)

---

## Completed

Phases 1–18 complete. See [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14.

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

---

## Phase 19 — Species Validation ✅

- `src/data/band-sizes.json` — ALPHA → string[] of valid band sizes (1,226 species, from Validations.xlsx Tab 1)
- `src/data/measurement-ranges.json` — ALPHA → `{ weight, wing, tail }` each with `{ femaleMin, femaleMax, maleMin, maleMax }` (815 species, 0 = omitted)
- New validation rules in `src/utils/validation.ts`:
  - Band size mismatch: warn if selected band's size is not in the species' valid size list
  - Measurement out of range: warn if wing/bodyMass/tail is outside the expected range for the species + sex
  - Sex unknown: warn only if outside *both* male and female ranges
  - Disposition requires notes: warn if Disposition is set but Notes is empty
  - Disposition × Status: deferred — need to confirm mortality status codes with Hallie
- Bird Record Form: warnings inline below Band Number, Wing, Tail, Body Mass fields
- Tests: 21 new (106 total)

---

## Phase 20 — Band History View

Goal: Encounter timeline for a band, accessible from Band Inventory and from banding records.

### 20a — Band Inventory Enhancements
- Expand "View All Bands" with search/filter: filter by status ("deployed"), band size, sort by last seen date (default) or band number
- Band row tap → Band History detail view
- Last seen date derived from most recent banding record referencing the band

### 20b — Band History Detail View
- Header: band number, current status, species banding code, recapped (Y/N), last encounter date
- Encounter timeline: each row shows date, species, station, capture code, bander, WRP, sex, photo indicator, has-notes
- Each encounter row links to its session
- Read-only — no editing from this view
- Entry points: Band Inventory row tap + band number link on banding record form

### 20c — Foreign Band Entity Flow
- Foreign bands get a Band entity (status: `foreign`) rather than freetext
- When a user enters an unknown band number in BandSearchSelect, prompt to create a foreign Band entity (with optional size field)
- Replaces current freetext "foreign recapture" flow
- Foreign bands appear in Band Inventory and have history timelines like inventory bands
- Note: full foreign band representation (BBL lookup, ownership, etc.) deferred to later phase

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
