# BirdNerd — Plan

**Now:** Phase 24 — Field Small Fixes (next up). Phases 25–27 (Bulk Data Import, Net Hours, Smart Band Entry) queued behind it. _Update this line whenever the active phase changes._

See also: [apps/field/product-specifications.md](apps/field/product-specifications.md) | [apps/field/tech-specifications.md](apps/field/tech-specifications.md) | [apps/field/ux-specifications.md](apps/field/ux-specifications.md) | [apps/field/entities.md](apps/field/entities.md) | [repo/monorepo.md](repo/monorepo.md) | [repo/deployment.md](repo/deployment.md) | [archives/plan.v6.md](archives/plan.v6.md) | [archives/plan.v5.md](archives/plan.v5.md)

---

## Completed

Phases 1–21 complete. See [plan.v5 (archived)](archives/plan.v5.md) for phases 20–21, [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, and [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14.

Completed sub-phases of Phase 22 (OCR 0.2.0–0.4.1, Shared 0.2.0, Field 0.22.0) and Phase 23 (Sync 0.1.0–0.2.0) are archived in [plan.v6 (archived)](archives/plan.v6.md). Their unfinished sub-phases remain below under Phase 22 and Phase 23.

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

> **Field 0.23.0 is intentionally skipped.** Field minor version is kept aligned with the global phase number for readability; Phase 23 is the Sync spike, so the first new field release is 0.24.0. The four field phases below (24–27) run ahead of the remaining OCR (0.4.2+) and Sync (0.3.0+) work.

## Phase 24 — Field Small Fixes (Field 0.24.0)

Goal: A batch of small, high-value field-app fixes from Hallie. All fields stay optional; soft warnings only.

_Prelude (done): thin Playwright smoke harness added (`apps/field/e2e/`, `npm run test:e2e`) so the UI-heavy commits below can be verified in a real browser without ad-hoc setup. Smoke = app-boot + key-screen render; plus regression guards on the commit-1 code tables. Detailed flows deferred (see Backlog)._

**Codes & form fields**
- Add band sizes `4a`, `5`, `6`
- Skull: add `8` (invisible); remove `X` (not checked)
- ✅ Add **Alula** to the molt limits & plumage section — same dropdown options as the rest, ordered immediately after S covs (now G Covs). _Captured in form + CSV + bundle (v5); NOT added to the fixed agency export — confirm with Hallie whether Alula belongs in the IBP/BBL export._
- ✅ Rename `S covs` → `G Covs` — _display label only. The stored field (`moltLimitsSCovs`) and agency-export header still read "S covs"; confirm with Hallie whether the agency export header should also change (depends on whether the agency parses by header name) before renaming the data key (which would need an IndexedDB + bundle migration)._
- ✅ Reorder the condition section read-out: skull → CP → BP → Fat → body molt → ff molt → ff wear → juv body plumage
- WRP dropdown label expansions: in `AFCF`, `A` = Adult ("Adult First Complete Formative"); `M` = Minimum; `H` = Hatch Year — **DEFERRED**: scope (all prefixes vs. just these) ambiguous and `WRP_CODES` lives in `@birdnerd/shared` (also used by OCR); confirm with Hallie before editing shared
- Disposition: add `X` for ectoparasite

**Form layout**
- ✅ Place age and how-aged next to each other; sex and how-sexed next to each other (leave the 2nd entries as-is for now)

**Band Inventory**
- ✅ Allow more than 500 bands per batch (raised cap to 2000)
- ✅ Band-inventory-by-size summary: differentiate Standard, Lock-on, Stainless Steel, and 4-short (now "By Size & Type")
- Delete or modify band inventory _(commit 4b)_
- ✅ All Bands view: show string range (by 100s)
- ✅ All Bands view: fix pagination/scroll — currently caps at first ~100–200 with no way to view the rest
- ✅ Export band inventory to share across devices (CSV export; cross-device restore also via the full JSON bundle in Data Manager)

**Views & read-only**
- View records in Data Manager
- View records within a session without editing (read-only mode)
- Session bird list: show WRP code instead of the BBL # for age
- ✅ Faster capture time: select a standard net-check interval (e.g. every 30 min) instead of toggling each time

---

## Phase 25 — Bulk Data Import (Field 0.25.0)

Goal: Get Hallie's existing banding data into the field app. Her current data isn't linked to sessions, so this phase **starts with a data-shape conversation, not a build** — we can't scope the importer until we see the structure. Sequenced after Small Fixes so the form/code/inventory changes that affect the schema land first.

Open questions to resolve with Hallie first:
- What is the source of truth — `MASTER BANDING DATA.xlsx`, or something else?
- How are records currently organized if not by session (by date? by sheet? flat list)?
- Decide import approach: a guided in-app import UI vs. a one-time developer-assisted import from the spreadsheet
- How to handle session-less records: assign to a session on import, allow session-less records, or create a catch-all import session per date/sheet

Once scoped:
- Map existing columns to BirdNerd record / session / band schema
- Validate on import as **soft warnings only — never block** (per project conventions)
- Preserve idempotency / avoid duplicate imports on re-run
- Confirm whether imported bands should reconcile against Band Inventory

---

## Phase 26 — Net Hours (Field 0.26.0)

Goal: Per-net effort tracking and total net-hours at session close. Extends the Phase 11 SessionNetLog / net-hours groundwork.

- Open/close time per net
- Calculate total NET HOURS (each net = 1 net-hour for every hour run)
- Note field for nets opened or closed in a non-standard fashion
- Surface the net-hours total when closing the session

---

## Phase 27 — Smart Band Entry (Field 0.27.0)

Goal: Speed up band record entry and help catch missing or mis-deployed bands during banding.

- Enter species → suggested band size(s) pop up on screen
- Select a band size → auto-populate the next band in that series from inventory
- Designed to help track missing bands / errors while deploying bands
- Ties together species band-size data, Band Inventory, and band-series sequencing

---

## Phase 22 — Bandsheet OCR

Goal: Build a row-by-row transcription assistant for one supported BirdNerd bandsheet layout, with OCR layered in incrementally. **Completed sub-phases (0.2.0–0.4.1) are archived in [plan.v6](archives/plan.v6.md); only unfinished work remains below.**

Assumptions for Phase 22:
- Focus on one known bandsheet layout for the foreseeable next phases
- V1 output is reviewed CSV/table data, not direct BirdNerd import
- Primary workflow is row-at-a-time review beside the source image
- OCR is assistive, not the first milestone
- Human correction is required before output is trusted

### OCR 0.4.2 — OCR Review Tuning
- Highlight uncertain or incomplete OCR-prefilled fields
- Tune OCR-to-row mapping and review behavior based on real usage
- Expand OCR field coverage only if the first-pass fields are working well
- Add confidence-aware review cues such as yellow/red highlighting for low-confidence OCR results
- Tune fixed-layout field segmentation and postprocessing rules before broadening field coverage
- Add the first limited OCR tests at the pure-helper level (geometry and OCR mapping/postprocessing), not drag-heavy UI interactions yet
- Switch `bandNumber` from grouped-field OCR toward per-cell OCR if grouped recognition continues to collapse or skip digits

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

## Phase 23 — P2P Sync Spike

Goal: Prove that 2–5 known devices can sync banding records without a central data server, using CRDT-based sync and cryptographic device identity with in-person enrollment. Runs as a parallel track to Phase 22 OCR work.

Assumptions for Phase 23:
- `apps/sync-spike` is a standalone PWA, isolated from the field app
- Uses the field app's banding record shape but its own IndexedDB store
- A signaling relay is acceptable — a tiny server that brokers WebRTC handshakes but is blind to data content; use free public relay to start
- Two-track approach: sync mechanics first, identity/security second
- Success = two real devices sync a banding record change across the internet, with access gated to enrolled devices only
- Decision gate at Sync 0.5.0: integrate into field app, continue parallel, or deprioritize in favor of Supabase

**Completed sub-phases (Sync 0.1.0–0.2.0) are archived in [plan.v6](archives/plan.v6.md); only unfinished work remains below.**

### Sync 0.3.0 — Device Identity & Pairing
- Web Crypto API keypair generation per device, stored in IndexedDB
- QR code invite flow for in-person enrollment
- Replace room password with device-keyed access
- Org trusted-device list maintained per device
- Key rotation: issuing a new group key excludes revoked devices

### Sync 0.4.0 — Automerge Comparison (optional)
- Port sync layer to Automerge
- Compare CRDT merge behavior on banding records vs Yjs
- Evaluate which handles field-edit conflicts more predictably

### Sync 0.5.0 — Retrospective & Decision Gate
- Evaluate merge correctness, offline behavior, and pairing UX on real devices
- Compare P2P model against Supabase/centralized on complexity, cost, auditability
- Document findings and decide next direction for sync in the field app

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
- OCR tests: wait until the row review workflow settles, then start with pure geometry/state helpers instead of drag-heavy UI interactions

**Dev tooling**
- Dependency refresh pass: review and update app/package dependencies across the monorepo at an intentional checkpoint
- E2E UX tests (Playwright): **thin smoke harness landed in Phase 24** (`apps/field/e2e/`, `npm run test:e2e`, not CI-gated) — app-boot + form/inventory render + commit-1 code-table guards. Still to do: detailed flows (session CRUD, banding record round-trip, offline export/import) once the Phase 24 form/view changes settle
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
