# BirdNerd — Plan

See also: [apps/field/product-specifications.md](apps/field/product-specifications.md) | [apps/field/tech-specifications.md](apps/field/tech-specifications.md) | [apps/field/ux-specifications.md](apps/field/ux-specifications.md) | [apps/field/entities.md](apps/field/entities.md) | [repo/monorepo.md](repo/monorepo.md) | [repo/deployment.md](repo/deployment.md) | [archives/plan.v5.md](archives/plan.v5.md)

---

## Completed

Phases 1–21 complete. See [plan.v5 (archived)](archives/plan.v5.md) for phases 20–21, [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, and [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14.

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

## Phase 22 — Bandsheet OCR

Goal: Build a row-by-row transcription assistant for one supported BirdNerd bandsheet layout, with OCR layered in incrementally.

Assumptions for Phase 22:
- Focus on one known bandsheet layout for the foreseeable next phases
- V1 output is reviewed CSV/table data, not direct BirdNerd import
- Primary workflow is row-at-a-time review beside the source image
- OCR is assistive, not the first milestone
- Human correction is required before output is trusted

### OCR 0.2.0 — Sheet Review & Row Preparation ✅
- Support one known bandsheet layout only
- Upload image files of bandsheets
- Establish OCR-specific branding assets from the new media/logo work
- Add simple image rotation for slightly tilted sheet photos
- Manual entry of sheet/header metadata for now
- Detect or manually define row regions
- Show full sheet plus per-row crop view
- Review one row at a time
- Allow row geometry refinement before transcription
- No structured row data entry yet
- No BirdNerd import yet
- Initial implementation slices: upload image + full sheet viewer; manual row definition/adjustment; selected row crop + next/previous navigation

### OCR 0.3.0 — Core Row Data Model & Review UX ✅
- Begin structured row transcription after sheet/row geometry is in place
- Define OCR-app row draft schema for the first supported field subset
- First-pass subset: bander's initials, code, band number, species alpha code, age, how aged, WRP code, sex
- Add row status flow: unreviewed, in progress, reviewed
- Add next/previous row workflow
- Add a selected-row draft editor tied to each manual row box
- Preserve image-to-row context while editing

### OCR 0.3.1 — Row Review Workflow Polish ✅
- Continue the structured row review workflow after the first editable draft milestone
- Polish row editing and review interactions based on real usage
- Reorganize the row editor into left / middle / right sections that roughly mirror the physical row
- Keep short coded fields visually compact, especially in the left-hand section
- Expand the left-hand draft fields to cover the remaining short-coded row cells before moving deeper into middle/right sections
- Confirm and fix row-selection/draft persistence edge cases discovered during testing
- Evaluate layout refinements for preview, controls, and row list placement with desktop-first testing

### OCR 0.3.2 — Export & Guided Entry ✅
- Add CSV/table export for reviewed rows
- Add export preview table for non-empty row drafts before download
- Keep export logic modular via a pure export utility and dedicated preview component

### OCR 0.3.3 — Cleanup & Structure ✅
- Centralize OCR row draft field schema so draft initialization, editor layout, and CSV export share one source of truth
- Refresh OCR workspace copy so the UI reflects the current review-and-export workflow
- Keep the displayed OCR version derived from `package.json` / `__APP_VERSION__`
- Remove the nested-button annotator pattern and preserve keyboard focus/selection for row boxes

### Shared 0.2.0 — OCR/Field Metadata Foundation ✅
- Extract reusable field metadata from OCR into `packages/shared` where it is clearly domain-level rather than app-local
- Define shared enum-like/code-list structures for constrained banding fields that both field app and OCR app can consume
- Keep the shared package focused on pure metadata/types/helpers, not OCR UI behavior
- Use this shared layer to support the first field-aware OCR inputs without duplicating code tables or option definitions

### Field 0.22.0 — Shared Metadata Adoption ✅
- Adopt the shared banding code metadata from `@birdnerd/shared`
- Keep current field-app behavior unchanged while the source of truth for constrained code tables moves into the shared package
- Verify field build and regression tests after the shared extraction

### OCR 0.3.4 — Guided Entry Inputs ✅
- Add the first field-aware inputs where useful: combobox/select/code helpers for constrained fields
- Start with constrained banding fields such as code, species alpha code, age, sex, how aged, and how sexed
- Reuse shared metadata from `packages/shared` where practical instead of hardcoding OCR-only option lists
- Use native `datalist` as the lightweight first guided-input step; consider a custom compact one-line combobox later if browser rendering remains too noisy
- Continue confirming and fixing any row-selection/draft persistence edge cases discovered during testing
- Keep refining the row-review workflow now that export and the left-side coded layout are in place

### OCR 0.4.0 — OCR Engine Integration ✅
- Introduce the first OCR engine/library for the supported bandsheet workflow
- Start with a Tesseract-first browser experiment and treat it as a viability spike rather than a permanent architecture commitment
- Run OCR against the current row-based review flow rather than a separate pipeline
- Keep the initial OCR scope narrow and prove that browser-based OCR is viable for this layout
- Keep human review mandatory
- Revisit cloud OCR or heavier document-parsing options only if Tesseract quality or browser performance is not good enough
- Initial implementation slices: dedicated OCR service/module; run OCR on the selected row crop only; add a `Run OCR on This Row` action with visible progress/error state; show raw OCR text for inspection; try first-pass prefill for a very small field subset such as band number, species alpha code, age, sex, and code
- Current learning: generic row-level OCR is weaker than focused field-level OCR on this grid-heavy layout, so the next steps should bias toward tighter field windows and constrained recognition

### OCR 0.4.1 — OCR Row Prefill
- Prefill draft values into the existing row editor from OCR output
- Focus on the current constrained left-side field set first
- Surface OCR output in a way that fits the existing row-by-row review workflow
- Continue measuring OCR usefulness on real bandsheet examples
- Shift from generic row OCR toward focused field-level OCR where the layout and value constraints are predictable
- Start with species alpha code and band number experiments using tighter field windows and field-specific OCR constraints
- Initial implementation slices: define layout-specific field windows within the selected row; crop species code and band number subregions from the selected row; run field-specific OCR presets on those subregions; keep raw field OCR results visible; prefill only `speciesCode` and `bandNumber` when the suggestions are usable

### OCR 0.4.2 — OCR Review Tuning
- Highlight uncertain or incomplete OCR-prefilled fields
- Tune OCR-to-row mapping and review behavior based on real usage
- Expand OCR field coverage only if the first-pass fields are working well
- Add confidence-aware review cues such as yellow/red highlighting for low-confidence OCR results
- Tune fixed-layout field segmentation and postprocessing rules before broadening field coverage
- Add the first limited OCR tests at the pure-helper level (geometry and OCR mapping/postprocessing), not drag-heavy UI interactions yet

### OCR 0.5.0 — Validation-Assisted Correction
- Reuse BirdNerd code/domain knowledge to flag likely OCR mistakes
- Species alpha/code suggestions
- Code-list constrained inputs for age/sex/how aged/how sexed/status
- Soft warnings for suspicious combinations
- Fast correction workflow optimized for many rows

### OCR 0.5.1 — Intake & Guided-Entry Polish
- Add simple image rotation for slightly tilted sheet photos
- Consider a custom compact one-line combobox if native `datalist` rendering remains too noisy
- Continue layout and intake polish outside the core OCR-engine milestones

**Later OCR phases**
- Expand supported row fields beyond the initial subset
- Add header metadata OCR
- Add direct BirdNerd import after review
- Consider camera capture workflow
- Consider model fine-tuning only after enough corrected examples exist

---

## Backlog (unordered — to be phased later)

**Distributed Database Architecture**
- Research peer-to-peer sync model as an alternative to centralized cloud (Supabase/Postgres)
- Candidate approaches: CRDTs (e.g. Automerge, Yjs), libp2p, gun.js, OrbitDB, or custom sync over WebRTC
- Key questions: conflict resolution for banding records, identity/trust without a central auth server, offline-first compatibility with existing IndexedDB layer, partial sync (station-scoped vs. org-wide)
- Compare against centralized sync (see Cloud Sync & Auth backlog item) on: complexity, cost, multi-org scalability, and auditability requirements (BBL/CDFW submissions)

**Media**
- Photo Log view: browse PhotoRecords grouped by session, filter by species/date
- Speech-to-text (STT) input for field entry

**Code Quality**
- SessionView decomposition: ~800 lines with mixed concerns (data loading, form state, rendering) — split into sub-components or custom hooks
- DB-layer band lifecycle tests: no tests for band status transitions (deploy, revert on delete, multi-record reference check)
- FK integrity checks: deleting a location/person doesn't warn about referencing sessions/records
- App.tsx routing: replace if/else chain with a route map or lightweight router as view count grows
- OCR tests: wait until the row review workflow settles, then start with pure geometry/state helpers instead of drag-heavy UI interactions

**Dev tooling**
- Dependency refresh pass: review and update app/package dependencies across the monorepo at an intentional checkpoint
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

**Open Decisions** — See [apps/field/product-specifications.md § 8](apps/field/product-specifications.md#8-open-decisions--todos) for the canonical list.
