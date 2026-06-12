# BirdNerd — Plan

**Now:** Phases 24–25 shipped (Field Small Fixes + Bulk Data Import incl. lost/destroyed-band records, field 0.25.8 / shared 0.2.4; detail in [plan.v7](archives/plan.v7.md)). **Phase 25 wrap-up** = the open Hallie confirmations only (agency-export `S covs`/`G covs`, Alula, status values — see below). **Next phase: 26 — Long-term Architecture Review** (review [research-long-term-architecture.md](resources/research-long-term-architecture.md), produce a decision doc + roadmap), then Phase 27 Net Hours, Phase 28 Smart Band Entry. Also open (unscheduled): code-table reconciliation vs the 2025 MAPS manual ([research-banding-codes-2023-vs-2025.md](resources/research-banding-codes-2023-vs-2025.md)). _Update this line whenever the active phase changes._

See also: [apps/field/product-specifications.md](apps/field/product-specifications.md) | [apps/field/tech-specifications.md](apps/field/tech-specifications.md) | [apps/field/ux-specifications.md](apps/field/ux-specifications.md) | [apps/field/entities.md](apps/field/entities.md) | [repo/monorepo.md](repo/monorepo.md) | [repo/deployment.md](repo/deployment.md) | [archives/plan.v6.md](archives/plan.v6.md) | [archives/plan.v5.md](archives/plan.v5.md)

---

## Completed

Phases 1–21 complete. See [plan.v5 (archived)](archives/plan.v5.md) for phases 20–21, [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, and [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14. Field phases **24–25** are complete — full detail in [plan.v7 (archived)](archives/plan.v7.md).

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
| 24 | Field Small Fixes (0.24.x) — code tables, Alula tract (bundle v5), form reorg, band inventory, read-only views, Playwright smoke harness + CI gate ([plan.v7](archives/plan.v7.md)) |
| 25 | Bulk Data Import (0.25.x) — master-sheet CSV importer + lost/destroyed-band records ([plan.v7](archives/plan.v7.md)) |

---

> **Field 0.23.0 is intentionally skipped.** Field minor version is kept aligned with the global phase number for readability; Phase 23 is the Sync spike, so the first new field release is 0.24.0. The field phases below (26–28) run ahead of the remaining OCR (0.4.2+) and Sync (0.3.0+) work.

## Phase 25 wrap-up — Hallie confirmations (open)

Phases 24 and 25 shipped (detail archived in [plan.v7](archives/plan.v7.md)). What's left from the Phase 25 conversation — confirm with Hallie, then implement the relevant fix:

- **Molt-limits `S covs` vs `G covs`:** ✅ Confirmed with Hallie — "S covs" and "G covs" (greater coverts) are synonyms in banding usage; both refer to the greater secondary coverts. The Phase 24 UI relabel to "G Covs" is correct and intentional. No data-key or export-header change needed; `moltLimitsSCovs` and the export column "S covs" match the master sheet and remain unchanged.
- **Alula in agency export:** the **master sheet has no `Alula` column** (verified), so the agency format historically excludes it; our export omits it too (Alula is app-data + app-CSV only). Ask whether she expects to start submitting `Alula` to the agency soon (evolve the format) or keep it app-only.
- **`Status` column:** does her **full** master sheet use status values outside our table (`300, 301, 318, 319, 333, 334, 380, 500, 700, ---`) so we can extend `BIRD_STATUS_CODES`?

_Separate research, not yet scheduled:_ reconcile our code tables against the 2025 MAPS manual ([research-banding-codes-2023-vs-2025.md](resources/research-banding-codes-2023-vs-2025.md)) — disposition missing F/R + M mislabeled, molt-limits M/X mislabeled, body-molt labels shifted, feather-pull boolean vs O/X/I/C, how-aged/sexed BBL-vs-MAPS letters.

---

## Phase 26 — Long-term Architecture Review (design phase)

Goal: review the long-term architecture vision in [research-long-term-architecture.md](resources/research-long-term-architecture.md) against BirdNerd's current shape, and turn it into a concrete, sequenced action list. This is a **planning/design phase** — produce decisions + a roadmap, not a big-bang rewrite.

The vision (Ken's notes): a local-first science PWA where **immutable domain events** are the durable source of truth, **relational projection tables** serve the UI/queries, writes go through a **command → validate → event → projection** pipeline, schema is versioned **per event type** (not one global app-schema version), **workspaces** scope multi-station collaboration, and a **sync-adapter abstraction** keeps the domain model ignorant of the sync mechanism (Supabase + PowerSync/RxDB first, P2P later). Core principle: event log = durable truth, tables = rebuildable projections, sync providers = replaceable infra.

Review tasks:
- **Gap analysis** — contrast the vision with today: mutable IndexedDB entities via `idb`, single `BUNDLE_VERSION` + migration, FK-linked relational-ish stores, the Phase 23 Yjs sync spike. Name what already aligns (local-first, client IDs, soft deletes in places) vs what doesn't (mutable records, global schema version, no event log/command layer).
- **Reconcile with existing backlog** — this vision overlaps and should absorb/supersede several Backlog items: **Schema Migration Framework**, **Cloud Sync & Auth** (Supabase/multi-tenant/workspaces), **UUIDv7 ID migration**, and the **Sync spike** (Phase 23) decision gate. Decide which of those become steps here.
- **Decide adoption order & scope** — what's worth doing *now* on a single-station offline app (e.g. UUIDv7 IDs, soft-delete + version/`workspace_id`/`station_id` columns, a command layer in front of writes) vs deferred until multi-station/cloud is real (full event sourcing, projection rebuilds, Supabase + PowerSync, P2P). Flag the riskiest/most-irreversible decisions.
- **Output** — a short ADR-style decision doc (likely under `docs/resources/` or `docs/repo/`) + concrete follow-up phases/tickets, and prune/merge the overlapping Backlog entries.

Open question for Ken: what's the real near-term trigger — a second station/user, a specific reproducibility/audit need, or just future-proofing? That sets how much of this to pull forward vs leave as a documented target.

**Also in Phase 26:** Seed `packages/shared/src/lexicon.ts` — ✅ done (shared 0.2.5). Canonical `LexiconEntry[]` for ~38 banding terms (feather tracts, molt, age/sex, condition, capture codes, protocol, morphometrics, band). TypeScript now; YAML migration is a future portability step. Exported from `@birdnerd/shared`. Future layers: developer reference, info hovers, 1-sheet handout, i18n, ontology.

---

## Phase 27 — Net Hours (Field 0.27.0)

Goal: Per-net effort tracking and total net-hours at session close. Extends the Phase 11 SessionNetLog / net-hours groundwork.

- Open/close time per net
- Calculate total NET HOURS (each net = 1 net-hour for every hour run)
- Note field for nets opened or closed in a non-standard fashion
- Surface the net-hours total when closing the session

---

## Phase 28 — Smart Band Entry (Field 0.28.0)

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
- Confirm the full band-type list with Hallie (current: Standard, Stainless-steel, 4-short, Lock-on — see the `BAND_TYPE_CODES` TODO in `codes.ts`)

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
