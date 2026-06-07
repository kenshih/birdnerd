# BirdNerd — Plan

**Now:** Phase 24 — Field Small Fixes ✅ complete. At **field 0.24.10** / shared 0.2.2 (WRP label expansion shipped — full `Minimum`/`Hatch Year`/`Adult` words; 0.24.7–0.24.9 were a test-buildout + cleanup-sweep run). Next: Phase 25 — Bulk Data Import (opens with a Hallie conversation; still carries the remaining agency-export questions). _Update this line whenever the active phase changes._

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
- ✅ Add band sizes `4a`, `5`, `6`
- ✅ Skull: add `8` (invisible); remove `X` (not checked). _Decision: legacy records with skull `X` map to `8` on import (Phase 25 importer to apply)._
- ✅ Add **Alula** to the molt limits & plumage section, ordered immediately after S covs (now G Covs) — captured in form + CSV + bundle (v5). _(Agency-export follow-up → Phase 25.)_
- ✅ Rename `S covs` → `G Covs` — display label only; stored field `moltLimitsSCovs` unchanged. _(Agency-export/data-key follow-up → Phase 25.)_
- ✅ Reorder the condition section read-out: skull → CP → BP → Fat → body molt → ff molt → ff wear → juv body plumage
- ✅ Disposition: add `X` for ectoparasite
- ✅ **WRP label expansion (#4):** expanded every `A`→Adult / `M`→Minimum / `H`→Hatch Year prefix to full words across all WRP code labels in `@birdnerd/shared` (shared 0.2.2 / field 0.24.10). Codes unchanged (display-only), so OCR + existing records unaffected.

**Form layout**
- ✅ Place age and how-aged next to each other; sex and how-sexed next to each other (leave the 2nd entries as-is for now)

**Band Inventory**
- ✅ Allow more than 500 bands per batch (raised cap to 2000)
- ✅ Band-inventory-by-size summary: differentiate Standard, Lock-on, Stainless Steel, and 4-short (now "By Size & Type")
- ✅ Delete or modify band inventory (edit size/type/status + delete, from the band detail view; delete warns when the band is referenced by records)
- ✅ All Bands view: show string range (by 100s)
- ✅ All Bands view: fix pagination/scroll — currently caps at first ~100–200 with no way to view the rest
- ✅ Export band inventory to share across devices (CSV export; cross-device restore also via the full JSON bundle in Data Manager)

**Views & read-only**
- ✅ View records in Data Manager (Browse Records, grouped by session → opens read-only view)
- ✅ View records within a session without editing ("View" button → read-only record)
- ✅ Session bird list: show WRP code instead of the BBL # for age
- ✅ Faster capture time: select a standard net-check interval (e.g. every 30 min) instead of toggling each time

---

## Phase 25 — Bulk Data Import (Field 0.25.0)

Goal: Get Hallie's existing banding data into the field app via an in-app CSV importer. Sequenced after Small Fixes so the form/code/inventory changes that affect the schema land first.

**Design** (data-shape conversation done, grounded in `nogit/MASTER-BANDING-DATA.csv` — 342 rows, 1 station `GCFS`, 37 days, Dec 2024–Mar 2026):

In-app CSV importer in Data Manager: upload → **preview summary** (sessions / bands / records to create, skips, rejects, warnings) → confirm → write to IndexedDB. Re-runnable.

Entity derivation:
- **Sessions** = station + date (~37). Distinct banders that day → `SessionBanderLog`; `masterBanderId` = HD when present among them, else blank. Protocol/weather left blank.
- **Bands** = every Band Number → inventory entry. Status: `deployed` (capture, Code IBP `N`), `destroyed` (`BAND DESTROYED`, `D`), `lost` (`BAND LOST`, `L`). `bandType` left blank + warned (not in the sheet).
- **BirdRecords** = the capture rows (330 here), linked to session + band. The band-status rows (12 here) create bands only — no bird record.
- `bbpCode` ← **Code IBP/BBL** (not the `Status` column). `Status` (BBL composite, e.g. `300`/`318`) → maps **directly** to `BirdRecord.status`; validate against `BIRD_STATUS_CODES`, soft-warn on values outside the table.
- **Aging/sexing:** primary criterion (`howAged`/`howSexed`) ← the **BBL column directly** — verified lossless on the 330 captures (BBL never blank, perfect 1:1 with IBP, fills `NA`, all values valid app codes). Second criterion (`howAged2`/`howSexed2`) exists in the sheet **only as IBP single-letters** (`How Aged/Sexed IBP 2`), so derive it via a deterministic IBP→BBL lookup (`P→PL, M→MR, S→SK, L→LP, C→CL, I→MB, F→FF, J→PL, E→EY, B→BP, O→OT`). Data wart: one `How Sexed BBL` cell is the Excel artifact `FALSE` → treat as blank + warn.
- Unknown station `GCFS` → auto-create a stub `Location` (blank lat/long/name to fill in later).

No-clobber: **skip-if-exists, never overwrite.** Match keys: band# (bands), station+date (sessions), band#+date (records). Skips reported in the summary.

Two outputs:
- **Rejects CSV** — only structurally un-importable rows (e.g. unparseable date; none in this dataset). Original columns + a `_problem` column.
- **Warnings** — soft issues (blank band type, unrepresentable code values) shown in the summary; rows still import (all fields optional, soft warnings only).

Build steps:
- Finalize the ~50-column → record/session/band mapping table (first task).
- Build the IBP→BBL single-letter lookup (for the second aging/sexing criterion); soft-warn on any IBP letter not in the table.
- Parser + entity builders + dedup as pure functions (testable without DB/React).
- Preview/summary UI + confirm + IndexedDB writes; rejects/warnings download.
- Validate as **soft warnings only — never block** (per conventions).

Also confirm with Hallie (carried from Phase 24 — same conversation; then implement the relevant fix):
- **Molt-limits `S covs` vs `G covs`:** ⚠️ `G covs` (greater coverts) and `S covs` (secondary coverts) are **different feather tracts, not synonyms** — yet Phase 24 relabeled `S covs` → `G Covs` in the UI (display only; stored field `moltLimitsSCovs` and the export header still say `S covs`, matching the master sheet). Ask Hallie whether she genuinely wants `G covs` added/used, or whether the relabel request was a **mistake**. If real: it's a distinct tract → data-key change (IndexedDB + bundle migration) + export-header decision. If a mistake: revert the UI label back to `S covs`.
- **Alula in agency export:** point out to Hallie that the **master sheet has no `Alula` column** (verified — 0 occurrences), so the agency format historically excludes it; our export omits it too, and Alula is captured in app data + the app's own CSV only. Ask whether she expects to start submitting `Alula` to the agency soon (evolve the format) or keep it app-only.
- **`Status` column (master sheet):** decoded — BBL composite (base `3`/`5`/`7` = normal/sick/rehabbed + suffix, e.g. `00` band only, `18` blood sample); maps to `BirdRecord.status` / `BIRD_STATUS_CODES`. Only open ask: does her **full** master sheet use status values outside our table (`300, 301, 318, 319, 333, 334, 380, 500, 700, ---`) so we can extend it?
- **IBP vs BBL code systems:** resolved from the data — primary criterion maps losslessly from the BBL column; second criterion derives via an IBP→BBL lookup (see Design). Only open ask: does her **full** master sheet contain IBP aging/sexing letters beyond those seen here, so the lookup is complete? (Low-stakes — unmapped letters just warn.)

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
- E2E UX tests (Playwright): smoke harness + Phase 24 guards (`apps/field/e2e/`, `npm run test:e2e`, not CI-gated). **Test-buildout (0.24.x):** shared rich-record fixture + record save→reopen and JSON bundle export→import round-trips (0.24.3); band deployment/recapture/delete-warning flow (0.24.4–0.24.6). CI now gates the deploy on lint + `npm test` (e2e still local). Still to do: agency-export *content* (unit), CSV download fires, mobile width; possibly add e2e to CI. Goal: enough coverage that Claude can work more autonomously and Ken trusts no UX regressions.
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
