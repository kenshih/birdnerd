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

---

## Phase 14.5 — Cleanup & Fixes

Goal: Address band inventory bugs, small UX tweaks, and any loose ends before agency export.

- [x] Fix: sample data had 5 bands incorrectly marked "deployed" with no linked records
- [x] Fix: deployed bands should not appear in BandSearchSelect dropdown (except current record's band when editing)
- [x] Add session net logs to Hallie's example data (3 nets)
- [ ] TBD — other tweaks

---

## Phase 15 — Agency Export

> **Decision point:** Should agency export live in the app UI, or as standalone offline scripts (e.g. a CLI or notebook that reads the JSON data bundle)? The app already exports a full JSON bundle — a separate script could transform that into BBL/IBP/CDFW formats without adding complexity to the PWA. In-app export is nicer UX but adds code for a task that happens infrequently (a few times per season). TBD.

**Unit tests to add alongside export:**
- IBP → BBL code mappings (every field with dual coding)
- BBL upload format column ordering and value formatting
- Edge cases: missing fields, unbanded records, mortality records

Goal: Export in agency-specific formats.

- BBL upload format (58 columns, with IBP→BBL code mappings)
- BBL recapture upload format (60 columns)
- IBP format
- CDFW format
- Code translation layer (IBP codes stored internally → BBL/agency codes at export)
- Export from banding records, optionally scoped by location/session/date range

---

## Phase 16 — Band History View

Goal: Click band → encounter timeline.

- Band detail view: full metadata + encounter history (all capture/recapture events)
- Search by band number
- Link from banding record → band detail

---

## Phase 17 — About / RTM Page

Goal: TBD — to be specified.

---

## Backlog (unordered — to be phased later)

**Media**
- Photo Log view: browse PhotoRecords grouped by session, filter by species/date
- Speech-to-text (STT) input for field entry

**Dev tooling**
- E2E UX tests (Playwright): session CRUD, banding record flow, offline export/import round-trip
- Storybook for component-level UX checks (optional)

**Advanced Validation**
- Validation override mechanism: user acknowledges warning, auto-note generated
- Morphometrics × species range validation (wing, tail, tarsus, culmen, mass)
- Status × Disposition cross-validation
- Cross-field self-validation (contradicting data in multiple categories)
- Season × species × age/sex/molt consistency
- New/Recapture/Unbanded selection driving which codes are valid
- CSV import/export round-trip tests
- IBP → BBL code translation tests

**Band Inventory Advanced**
- Auxiliary markers (colored bands, 1-2 letters + 1-2 numbers)
- Band replacement tracking (old band → new band, linked history)
- Hummingbird band prefix → alpha mapping
- `how_obtained` recapture field (BBL reporting detail, not needed at capture time)
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
