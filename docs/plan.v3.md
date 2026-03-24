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

## Phase 11 — Weather & Effort Tracking

Goal: Per-session weather and per-net effort logging.

**11a. Weather on Session form**
- Two collapsible sections (Weather @ Open, Weather @ Close) on session create/edit
- Fields: Temperature (°C), Wind (Beaufort 0-12), Cloud Cover (0-100%), Precipitation (combobox: free text or pick from suggestions)
- Collapsed by default

**11b. Net soft-delete**
- Add `active: boolean` to Net type (default true for all existing nets)
- IndexedDB v5, bundle stays v2 (not yet shipped)
- Replace net hard-delete with soft-delete ("Remove from operation")
- Active nets shown in session setup; inactive hidden

**11c. SessionNetLog (dense model)**
- New SessionNetLog type + DB store
- On session create, auto-generate entries for all active nets at location, pre-filled with session open/close times
- Net Effort sub-page accessible from Session View (see ux-spec § 3.3)
- Tap row to inline-edit: open time, close time, remarks (free text)
- Auto-calculated net-hours per net + total session effort
- Bundle: add sessionNetLogs array (v2 — not yet shipped)

**11d. Tests**
- Net-hours calculation (edge cases: missing times, same open/close)
- SessionNetLog auto-generation from active nets
- Net soft-delete: inactive nets excluded from new session net list

---

## Phase 12 — Validation (Soft Warnings)

**Unit tests to add alongside validation:**
- Validation rule logic (sex/CP/BP conflicts, required-field triggers, override mechanism)
- CSV import/export round-trip (all field types: string, number, boolean)
- IBP → BBL code translation (Phase 15 prerequisite)

Goal: Implement priority validation rules (red items from specification).

- Sex=M + Brood Patch 3/4 → error
- Sex=F + Cloacal Protuberance 1-3 → error
- SK in How Aged → require Skull field
- Age=U → How Aged not required; Sex=U → How Sexed not required
- How Aged/Sexed = OT → require note
- Status 500 → require disposition + note
- Mortality → require note
- Blood Sample → validate status includes blood sample code (18)
- Species × band size validation (when band inventory exists)
- Override mechanism: user acknowledges warning, auto-note generated
- Validate net selection against nets opened in session (from SessionNetLog)

---

## Phase 13 — Band Inventory

Goal: Band lifecycle management per BBL requirements.

- Add bands by series (prefix + suffix range, band size, type)
- Inventory overview: deployed vs remaining by size + type
- Band number dropdown on banding form (replaces free text)
- Auto-update band status on record submission (set to "deployed" on New; track recaptures)
- Foreign recapture detection (band not in inventory)
- Band history view (future: click band → encounter timeline)
- Integration with BandingRecord: link band_number FK

---

## Phase 14 — Photo Capture (Web Share)

Goal: Attach photos to banding records without app-side storage — use the device camera, auto-name the file, and share to Google Drive (or any target) via the Web Share API.

- Add `photo_filename` field to BandingRecord (string, nullable)
- Camera input via `<input type="file" accept="image/*" capture="environment">`
- Photo review modal: shows captured image with auto-generated filename
  - Naming convention: `YYYY-MM-DD_STATION_SPECIES_BAND#_suffix.jpg` (e.g., `2026-03-22_GCBS_SOSP_1154-81501_wing.jpg`)
  - User can edit/add a suffix (wing, tail, head, or free text)
- "Save to Drive" button triggers `navigator.share({ files: [...] })` with the pre-named file
- Native share sheet opens → user picks Google Drive (or other app)
- On return, user confirms save → filename stored on the banding record
- Photo Log view (future): browse records that have photo filenames, grouped by session

---

## Phase 15 — Agency Export

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

## Backlog (unordered — to be phased later)

**Media**
- Speech-to-text (STT) input for field entry

**Advanced Validation**
- Morphometrics × species range validation (wing, tail, tarsus, culmen, mass — tables from Hallie)
- Status × Disposition cross-validation
- Cross-field self-validation (contradicting data in multiple categories)
- Season × species × age/sex/molt consistency
- New/Recapture/Unbanded selection driving which codes are valid

**Band Inventory Advanced**
- Auxiliary markers (colored bands, 1-2 letters + 1-2 numbers)
- Band replacement tracking (old band → new band, linked history)
- Hummingbird band prefix → alpha mapping

**Special Forms**
- Empidonax flycatcher supplemental datasheet
- Selasphorus hummingbird supplemental datasheet
- Other addendum datasheets (attachable to records, exportable)

**Toolkit Expansion**
- Standalone band code lookup tool
- Scientific name / definition lookup
- Lighter "in-the-field" utility mode

**Schema Migration Framework** (was Phase 15)
- Numbered migration runner for IndexedDB (leveraging idb's version-based upgrades)
- Retroactively capture schema changes as migrations
- Write each migration with a corresponding Postgres migration (for Supabase cutover)
- Unit tests: migration runner, data integrity after migration

**Cloud Sync & Auth** (was Phase 16)
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
