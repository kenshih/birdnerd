# BirdNerd — Plan v3

Informed by plan.v2, the updated entity model (entities.md), and the revised product specification.

See also: [product-specifications.md](product-specifications.md) | [entities.md](entities.md) | [archives/research-notes.md](archives/research-notes.md) | [archives/plan.v2.md](archives/plan.v2.md)

---

## Completed

### Phase 1 — MVP Data Capture ✅
- Offline PWA, installable on iPhone/iPad
- Species autocomplete (placeholder CA list)
- Sessions (station + date) + banding records in IndexedDB
- Single scrollable form with all fields

### Phase 2 — Deploy & Polish ✅
- GitHub Pages deployment (https://kenshih.github.io/birdnerd/)
- Home screen with branding (bird-in-hand icon)
- Save-to-home-screen guidance
- CSV export + CSV import

### Phase 3 — Full Species List ✅
- Import full 1,219-species BBL list from SPECIES sheet (ALPHA_CODE, SPECIES_NAME, SCI_NAME)
- Added sciName field to Species type
- Keep autocomplete UX (type code or name)

### Phase 4 — Navigation Shell & Routing ✅
- Home screen with all 6 module buttons (3 active, 3 disabled/coming-soon)
- State-based routing in App.tsx for all modules
- PlaceholderPage for unbuilt modules (Band Inventory, Locations, Feedback)
- ExportPage with per-session and export-all CSV support
- Disabled/dimmed styling for coming-soon buttons
- Feedback button opens mailto (ks.birdnerd@pm.me)

---

### Phase 5 — Code Tables & New Fields ✅

Goal: Upgrade code tables to Hallie's curated sets and add missing fields to the banding form.

**5a. Upgrade code tables (from Hallie's doc, not full LOOKUPS)**
- How Aged: 19 codes (BP, CC, CL, EG, EY, FB, FF, IC, LP, MB, MR, NA, NF, NL, NN, PL, RC, SK, OT)
- How Sexed: 11 codes (BP, CC, CL, EG, EY, MB, NA, PL, TL, WL, OT)
- WRP: 57 codes (FPJ…UUU) + Other — Hallie's station subset, not full ~120
- Capture Status / Code: 1, U, R, F, 4, 5, 6, 8, X
- Fat: 0–7 (0=None, 1=Trace, 2=Light, 3=Half, 4=Filled, 5=Bulging, 6=Gr. Bulging, 7=V. Excess)
- Status: 300, 301, 318, 319, 333, 334, 380, 500, 700, "---" (Mortality), Other
- Disposition: M, O, I, S, E, T, W, B, L, P, D
- Molt Limits & Plumage codes (J, L, F, B, R, M, A, N, U)

**5b. Add missing fields to BandingRecord**
- Tail (mm), Tarsus (mm ##.##), Exposed Culmen (mm ##.##), Other measurement (mm ##.##)
- Release Time (hh:mm with tap-to-fill-now button)
- WRP molt cycle code (dropdown from Hallie's 57-code subset + Other)
- FF Wear upgrade: free text → select dropdown (0–5: None, Slight, Light, Moderate, Heavy, Excessive)
- Juvenile Body Plumage (0-3)
- Molt Limits & Plumage table (PCovs, SCovs, PP, SS, Tert, Rec, Body Plum, Non-Feather)
- Disposition (M, O, I, S, E, T, W, B, L, P, D)
- Feather Pull (checkbox)
- Blood Sample (checkbox)
- How Aged secondary, How Sexed secondary
- Other measurement requires note

---

### Phase 6 — Location & Net Management ✅

- Location CRUD with bander ID (4-letter) + BBL ID (6-letter, nullable)
- Net management within location detail (add/delete, sorted)
- Centralized seed data config (src/data/seed.ts) — GCBS, MCFS, 10 nets
- IndexedDB v2 with locations + nets stores, auto-seed on first load
- Session station picker migrated from hardcoded STATIONS to Location dropdown

---

### Phase 7 — People & Roles ✅

- Person CRUD: initials, name, active/inactive toggle
- Bander association: link Person → Bander with role (Master Bander, Sub-permittee, Bander, Trainee)
- PersonDetail page: edit person info, add/update/remove bander role
- Seed known people + bander roles (HD, JW, TS, JVD, LC) via seed.ts
- IndexedDB v3 with people + banders stores, auto-seed on first load
- Bander dropdown on BandingRecord form (replaces free-text initials)
- Drives Session master bander + roster dropdowns (Phase 10)

---

### Phase 8 — Form UX Overhaul ✅

- Section reorganization: Identity → Condition (absorbs Molt) → Molt Limits & Plumage → Morphometrics & Status → Additional
- Searchable combobox (SearchableSelect component) for WRP (57 codes) with type-to-filter
- Net field upgraded to dropdown populated from session's location nets
- Bander field as dropdown (from Phase 7)
- Release Time "tap to fill now" (already done in Phase 5)
- Consistent PageHeader component: birdhouse home icon on all pages, back + home on sub-pages

### Phase 9 — JSON Data Bundle ✅

**Tests (vitest + fake-indexeddb):** ✅
- `validateBundle`: accepts valid bundles, rejects null/non-object/missing-version/newer-version/missing-arrays/non-array-entities
- Export round-trip: export → import → all 6 entity types match
- Replace mode: import wipes existing data, only imported data remains
- Empty bundle import: clears all stores gracefully

Goal: Portable backup/restore for all managed data. This is the primary persistence strategy before Postgres — IndexedDB + JSON export can comfortably handle a single station for years (~3K records/year ≈ 3-6 MB/year; IndexedDB handles 100K+ rows fine).

- Define bundle schema in `src/data/bundle-schema.ts` (TypeScript interface + `BUNDLE_VERSION` constant)
- Version convention: integer starting at 1, incremented on field additions/removals/renames (see tech-spec § 6 for full rules)
- Single JSON file covering all managed data: Locations, Nets, People, Banders, Sessions, BandingRecords
- Export: always full export, file named `birdnerd-backup-YYYY-MM-DD.json`
- Import: replace mode only (wipe existing data, load from bundle), with version validation (reject newer, migrate older)
- Remove seed.ts — replace with a bundled JSON seed file in the same format, loaded at runtime on first launch
- UI: add "Data Backup" section to the renamed "Data Manager" page (separate from existing CSV session export)
- Future entities (Bands, etc.) added to the bundle as they are built
- Existing CSV import/export for banding records remains independent (simpler per-session workflow)
- "Load Example Data (for Hallie)" button on Data Manager page — loads `public/data/example-data.json` (seed + sample session) for demo/testing purposes (temporary — remove once real data is in use)

---

### Phase 10 — Session Form & Views ✅

- Breaking change: `Session.station` → `Session.locationId` (FK to Location), bundle v1→v2 migration
- Session form: location, date, protocol (MAPS/Non-MAPS/etc.), MAPS period, open/close times (with Now), master bander dropdown, participant checkboxes (SessionBanderLog), notes
- Session list: richer display (protocol, time range, master bander, record count), delete with cascade confirmation
- Session detail: metadata summary, stats (new/recap/unbanded), edit session, cascade delete
- IndexedDB v4: sessionBanderLogs store, by-location index on sessions
- Bundle schema v2: sessionBanderLogs array, v1→v2 migration (station→locationId)
- All form fields soft-required (highlighted but always saveable)

---

### Phase 11 — Weather & Effort Tracking ✅

- Weather fields flattened into Session (8 fields: open/close temp, wind, cloud cover, precipitation)
- Collapsible component for weather sections on session create/edit (collapsed by default)
- SearchableSelect `allowFreeText` combobox mode for precipitation
- Net soft-delete: `active: boolean` on Net, IndexedDB v5, toggle UI in LocationDetail
- SessionNetLog dense model: auto-generated on session create for active nets, pre-filled with session times
- Net Effort sub-page accessible from Edit Session form: inline-edit times/remarks, add/remove nets, net-hours calculation
- Recap chip on banding record list rows (capture code R)
- Bundle stays v2: added sessionNetLogs array, Net.active field
- Tests: net-hours calculation, auto-generation, soft-delete filtering (13 new tests, 27 total)

---

### Phase 12 — Validation (Soft Warnings) ✅

- Pure validation function (`src/utils/validation.ts`) — no DB or React dependencies
- 9 rules: Sex+BP conflict, Sex+CP conflict, SK→Skull required, OT→note required, Status 500→disposition+note, Mortality→note, Status OT→note, Blood sample→status check, Net not in session effort
- Live inline warnings via `useMemo` + React Hook Form `watch()` — recompute on every field change
- Warning display: `⚠` prefix, red text under field, never blocks saving
- Multiple warnings on notes field concatenated with "; also required for..."
- Net validation loads SessionNetLogs mapped through Net labels for context
- Species × band size validation deferred to Phase 13
- Tests: 39 validation tests (66 total across all test files)

---

### Phase 13a — Band Inventory ✅

- Band entity: formatted band number (XXXX-XXXXX), BBL size codes (0, 0A…9), type (Standard, Buffy, Giant, Lockout) — TODO: confirm types with Hallie
- IndexedDB v6 with `bands` store (unique index on `bandNumber`), full CRUD + atomic `saveRecordWithBandUpdate`
- Bundle schema v3 with bands array, v2→v3 migration
- Band Inventory UI: overview dashboard (stats by size/status), filterable band list, bulk add-by-series with duplicate detection
- `BandSearchSelect` component replaces free-text band input on banding form. Auto-set capture code (available→N, deployed→R, foreign→F, UNBANDED→U). Deployed-band info alert
- Atomic band status update on record save (available→deployed)
- Foreign recapture: `bandId` null, `bandNumber` stored as free text, Capture Code = F
- Validation: capture code vs band status conflict warnings
- Tests: 74 total (45 validation, 16 bundle, 13 phase 11)

### Phase 13b — Recapture Fields & UX ✅

- Recapture fields on BirdRecord: `presentCondition` (select: H/I/S/D), `replacedBandNumber` (free text)
- Recapture Details section auto-shows when Capture Code = R, hides when changed away
- Fields discarded on save when Capture Code ≠ R
- CSV export/import updated with new fields
- No bundle version bump needed (new optional fields on existing entity)

### Phase 14 — Photo Capture (Web Share) ✅

- PhotoRecord entity (1-to-many from BandingRecord): `bodyPart`, `fileName`, `blob` stored in IndexedDB
- IndexedDB v7 with `photos` store, cascade deletes on record and session
- Camera input via `<input type="file" accept="image/*" capture="environment">`
- Photo review modal with live-updating filename preview as body part changes
  - Body part chip selector: WING, TAIL, HEAD, BODY, BAND + custom free text
  - Naming: `DAY_LOCCODE_BANDID_SPECIESCODE_BODYPART.ext` (e.g., `2026-03-22_GCBS_1154-81501_SOSP_WING.jpg`)
  - Unbanded: `UNBANDED003` replaces band ID (003 = record sequence in session)
  - Extension derived from uploaded file type (jpg, png, heic, etc.)
- "Save to Drive" button: `navigator.share` on mobile, file download fallback on desktop
- "Add Photo" button + photo list at top of banding record form (each row: body_part + filename + delete)
- New records: photos held as pending until record saved, then flushed to IndexedDB
- Bundle schema v4: photo metadata exported (no blobs), v3→v4 migration
- Tests: 74 passing

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
- E2E UX tests (Playwright): session CRUD, banding record flow, offline export/import round-trip. Best added before Cloud Sync when bugs get expensive.
- Storybook for component-level UX checks (optional)

**Advanced Validation**
- Validation override mechanism: user acknowledges warning, auto-note generated (from Hallie's doc re: Species × Band size "Did you gauge the leg?"). Consider if needed beyond band size.
- Morphometrics × species range validation (wing, tail, tarsus, culmen, mass — tables from Hallie)
- Status × Disposition cross-validation
- Cross-field self-validation (contradicting data in multiple categories)
- Season × species × age/sex/molt consistency
- New/Recapture/Unbanded selection driving which codes are valid
- CSV import/export round-trip tests (all field types)
- IBP → BBL code translation tests

**Band Inventory Advanced**
- Auxiliary markers (colored bands, 1-2 letters + 1-2 numbers)
- Band replacement tracking (old band → new band, linked history)
- Hummingbird band prefix → alpha mapping
- `how_obtained` recapture field (BBL reporting detail, not needed at capture time)

**Special Forms**
- Empidonax flycatcher supplemental datasheet
- Selasphorus hummingbird supplemental datasheet
- Other addendum datasheets (attachable to records, exportable)

**Toolkit Expansion**
- Standalone band code lookup tool
- Scientific name / definition lookup
- Lighter "in-the-field" utility mode

**Schema Migration Framework**
- Numbered migration runner for IndexedDB (leveraging idb's version-based upgrades)
- Retroactively capture schema changes as migrations
- Write each migration with a corresponding Postgres migration (for Supabase cutover)
- Unit tests: migration runner, data integrity after migration

**Cloud Sync & Auth**
- Multi-tenant data model: Organization as top-level, User entity, row-level security
- Supabase integration: Postgres backend, Auth (email/Google), IndexedDB ↔ Supabase sync
- API & SDKs: auto-generated API, supabase-js client
- Consider when: multiple stations sharing data, multiple concurrent users, or data exceeds ~100K records

**Effort & Reporting**
- Volunteer/person-hours tracking: derive from SessionBanderLog + session open/close times, or add explicit per-bander hours field

**Platform**
- Color band resighting data collection
- Admin dashboard (org management, user role assignment, data import/export)
- Protocol-specific forms and validations (Mist-netting, Trapping, Nest-box Monitoring, Rehabbed-Bird, etc.)
- Per-net/trap/nest metadata (type, coordinates within location, additional type-specific fields)
- Rehab records: capture location vs release location (record both or allow override)

**Branding**
- Vector art from bird drawings/photos for icons, splash, UI

**Open Decisions** — See [product-specifications.md § 8](product-specifications.md#8-open-decisions--todos) for the canonical list of unresolved design decisions (data model, UX, code systems).
