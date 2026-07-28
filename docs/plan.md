# BirdNerd — Plan

**Now:** **Phase 27 — Google OAuth & Identity Linkage**: begin the accepted collaboration architecture sequence in [ADR 0016](adr/0016-event-sourced-collaboration-architecture.md). Phase 26 is complete (design decision + roadmap). Next: Phase 28 Workspace vertical slice, Phase 29 local event core, then Phase 30 Supabase sync pilot. _Update this line whenever the active phase changes._

See also: [ADR 0016 — collaboration architecture](adr/0016-event-sourced-collaboration-architecture.md) | [ADR 0016 diagrams](adr/0016-event-sourced-collaboration-architecture-diagrams.md) | [apps/field/product-specifications.md](apps/field/product-specifications.md) | [apps/field/tech-specifications.md](apps/field/tech-specifications.md) | [apps/field/ux-specifications.md](apps/field/ux-specifications.md) | [apps/field/entities.md](apps/field/entities.md) | [repo/monorepo.md](repo/monorepo.md) | [repo/deployment.md](repo/deployment.md) | [archives/plan.v6.md](archives/plan.v6.md) | [archives/plan.v5.md](archives/plan.v5.md)

---

## Completed

Phases 1–21 and 24–26 are complete. See [plan.v5 (archived)](archives/plan.v5.md) for phases 20–21, [plan.v4 (archived)](archives/plan.v4.md) for phases 15–18, [plan.v3 (archived)](archives/plan.v3.md) for phases 1–14, and [plan.v7 (archived)](archives/plan.v7.md) for phases 24–25.

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
| 25 | Bulk Data Import (0.25.x) — master-sheet CSV importer, lost/destroyed-band records, and final code/export decisions ([plan.v7](archives/plan.v7.md)) |
| 26 | Long-term Architecture Review — accepted local-first collaboration architecture, ADRs, diagrams, and reordered roadmap ([ADR 0016](adr/0016-event-sourced-collaboration-architecture.md)) |

---

> **Field 0.23.0 is intentionally skipped.** Field minor version is kept aligned with the global phase number for readability; Phase 23 is the Sync spike, so the first new field release is 0.24.0. The field phases below (27–33) run ahead of the remaining OCR (0.4.2+) and Sync (0.3.0+) work.

## Phase 26 — Long-term Architecture Review ✅

Completed design phase. The real trigger is present: two Stations and two to four members need concurrent, offline-capable collaboration. [ADR 0016](adr/0016-event-sourced-collaboration-architecture.md) is the consolidated decision; its [diagram companion](adr/0016-event-sourced-collaboration-architecture-diagrams.md) visualizes it; [docs/adr/](adr/) records the durable decisions.

Also completed: `packages/shared/src/lexicon.ts` (shared 0.2.5), the canonical `LexiconEntry[]` for ~38 banding terms. TypeScript now; YAML migration remains a future portability step.

---

## Phase 27 — Google OAuth & Identity Linkage (Field 0.27.0)

Prove Google-only OAuth through Supabase Auth and map the external identity to a BirdNerd User Account. Define pending Workspace Membership activation by exact pre-authorized Google email. Do not yet create Workspaces through the Field PWA.

## Phase 28 — Workspace Vertical Slice (Field 0.28.0)

Scaffold `schemas/`, `@birdnerd/events`, `@birdnerd/banding`, and `@birdnerd/sync-state` sufficiently to prove an end-to-end `workspace.created` plus initial Admin Membership flow. A restricted Provisioner, not the Field PWA, creates this first Workspace through the ordinary event/admission/projection path. Placeholder implementations are acceptable outside the slice.

## Phase 29 — Local Event Core (Field 0.29.0)

Complete portable YAML/JSON-Schema Event Contracts, UUIDv7, generated TypeScript bindings with CI drift protection, `@birdnerd/events`, `@birdnerd/banding`, and a clean local event/projection store. Recreate all test and initial-hydration data to the new standards; do not migrate legacy local data.

## Phase 30 — Supabase Event Exchange & Collaboration Pilot (Field 0.30.0)

Complete Supabase Event Admission, `@birdnerd/sync-state`, the Supabase event-exchange adapter, Event Bundle recovery, offline behavior, and the two-Station/two-to-four-member pilot described in the Phase 26 decision.

## Phase 31 — Net Reconciliation, cleanup (Field 0.31.0)

Reconcile code tables against the 2025 MAPS manual ([research-banding-codes-reconciliation.md](resources/research-banding-codes-reconciliation.md)) — disposition missing F/R + M mislabeled, molt-limits M/X mislabeled, body-molt labels shifted, feather-pull boolean vs O/X/I/C, how-aged/sexed BBL-vs-MAPS letters.

## Phase 32 — Net Hours (Field 0.32.0)

Per-net effort tracking and total net-hours at session close. Extends the Phase 11 SessionNetLog/net-hours groundwork.

## Phase 33 — Smart Band Entry (Field 0.33.0)

Speed up band record entry and help catch missing or mis-deployed bands through species-size suggestions and inventory-series sequencing.

---

## Backlog: Bandsheet OCR

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

## Backlog: P2P Sync Spike (superseded as an integration path)

The standalone spike remains historical research. Phase 26 selects Supabase event exchange first behind `@birdnerd/sync-state`; a P2P adapter, event signatures, and device identity are deferred until they are a concrete need. See [ADR 0016](adr/0016-event-sourced-collaboration-architecture.md).

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

**Collaboration architecture** — absorbed into Phases 27–30: Google OAuth, Workspace Membership, UUIDv7, portable Event Contracts, event/projection stores, Supabase Event Admission/exchange, and the multi-device pilot. The clean release recreates test/hydration data rather than migrating existing local IDs.

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
