# BirdNerd — Plan

See also: [ADR 0016 — collaboration architecture](adr/0016-event-sourced-collaboration-architecture.md) | [ADR 0016 diagrams](adr/0016-event-sourced-collaboration-architecture-diagrams.md) | [apps/field/product-specifications.md](apps/field/product-specifications.md) | [apps/field/tech-specifications.md](apps/field/tech-specifications.md) | [apps/field/ux-specifications.md](apps/field/ux-specifications.md) | [apps/field/entities.md](apps/field/entities.md) | [repo/monorepo.md](repo/monorepo.md) | [repo/deployment.md](repo/deployment.md) | [archives/plan.v8.md](archives/plan.v8.md) | [archives/plan.v7.md](archives/plan.v7.md)

**Maintenance:** Follow [Roadmap Maintenance](repo/roadmap-maintenance.md) for plan, archive, and changelog updates. Use the project-specific `$field-release` skill for any Field version, release, changelog, or phase-completion work.

---

## Completed & archived

| Status | Scope | Canonical detail |
|--------|-------|------------------|
| Complete | Phases 1–14 | [plan.v3](archives/plan.v3.md) |
| Complete | Phases 15–18 | [plan.v4](archives/plan.v4.md) |
| Complete | Phases 19–21 | [plan.v5](archives/plan.v5.md) |
| Partially complete | Phase 22 — OCR 0.2.0–0.4.1, Shared 0.2.0, Field 0.22.0 | [plan.v6](archives/plan.v6.md); unfinished OCR work remains below |
| Partially complete / superseded | Phase 23 — Sync 0.1.0–0.2.0 | [plan.v6](archives/plan.v6.md); unfinished P2P work remains below as historical research |
| Complete | Phases 24–25 | [plan.v7](archives/plan.v7.md) |
| Complete | Phases 26–28 | [plan.v8](archives/plan.v8.md) |

---

## Current roadmap

### Phase 29 — Local Event Core (Field 0.29.0) — **Current**

Complete portable YAML/JSON-Schema Event Contracts, UUIDv7, generated TypeScript bindings with CI drift protection, `@birdnerd/events`, `@birdnerd/banding`, and a clean local event/projection store. Recreate all test and initial-hydration data to the new standards; do not migrate legacy local data.

### Phase 30 — Supabase Event Exchange & Collaboration Pilot (Field 0.30.0)

Complete Supabase Event Admission, `@birdnerd/sync-state`, the Supabase event-exchange adapter, Event Bundle recovery, offline behavior, and the two-Station/two-to-four-member pilot described in the Phase 26 decision.

### Phase 31 — Net Reconciliation, cleanup (Field 0.31.0)

Reconcile code tables against the 2025 MAPS manual ([research-banding-codes-reconciliation.md](resources/research-banding-codes-reconciliation.md)) — disposition missing F/R + M mislabeled, molt-limits M/X mislabeled, body-molt labels shifted, feather-pull boolean vs O/X/I/C, how-aged/sexed BBL-vs-MAPS letters.

### Phase 32 — Net Hours (Field 0.32.0)

Per-net effort tracking and total net-hours at session close. Extends the Phase 11 SessionNetLog/net-hours groundwork.

### Phase 33 — Smart Band Entry (Field 0.33.0)

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
