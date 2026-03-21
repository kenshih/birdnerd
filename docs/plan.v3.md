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

## Phase 5 — Code Tables & New Fields

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
- Juvenile Body Plumage (0-3)
- Molt Limits & Plumage table (PCovs, SCovs, PP, SS, Tert, Rec, Body Plum, Non-Feather)
- Disposition (M, O, I, S, E, T, W, B, L, P, D)
- Feather Pull (checkbox)
- Blood Sample (checkbox)
- How Aged secondary, How Sexed secondary
- Other measurement requires note

---

## Phase 6 — Form UX Overhaul

Goal: Reorganize the banding form for field usability.

- Section grouping per spec: Identity → Age & Sex → Condition → Molt Limits → Morphometrics & Status → Additional Info
- Combobox upgrade for fields with known code sets (How Aged, How Sexed, etc.) — show code + description
- Release Time "tap to fill now" button
- Net field updated to reference Net via dropdown (from nets defined at location level — depends on Phase 7)

---

## Phase 7 — Location & Net Management

Goal: Establish locations as the geographic and equipment foundation for banding operations.

**7a. Create Location CRUD**
- List all locations for the organization
- Create/edit form: name, coordinates (lat/lon), country, state, bander location ID (4-letter code)
- Remarks field
- Form validation: BBL location ID initially nullable; filled in after submission to BBL

**7b. Net Management (within Location)**
- Location detail view includes net inventory
- Add nets: label (e.g., "N-01", "Trap-A"), internal ID
- Edit/delete nets
- Nets are location-specific; reused across sessions
- Display net count in location list view

**7c. Data migration**
- Move from free-text station picker to Location dropdown on session form
- Migrate existing session station names → Location records

---

## Phase 8 — Schema Migration Framework

Goal: Formalize versioned schema migrations before the entity count grows significantly.

- Implement a numbered migration runner for IndexedDB (leveraging idb's version-based upgrades)
- Retroactively capture Phases 3-7 schema changes as migrations
- Write each migration with a corresponding Postgres migration (for Phase 12 Supabase cutover)
- Design for dual-mode: local IndexedDB as primary, Postgres as sync target
- See [product-specifications.md § 8.3](product-specifications.md#8-open-decisions--todos) for full context

---

## Phase 9 — Session Data Expansion

Goal: Build out session metadata to match the Banding Metadata Sheet and the entity model.

**9a. Session form updates**
- Location dropdown (from Phase 7)
- Protocol (dropdown: MAPS, Non-MAPS, etc.)
- MAPS Period (numeric field)
- Session Date (date picker)
- Master Bander dropdown (from Bander registry — see 9b)
- Bander Roster: multi-select or checkboxes for SessionBanderLog (all active org banders)
- Session open/close times (datetime)

**9b. Bander Registry**
- Local bander records: initials, name, role (Master Bander, Sub-permittee, Bander, Trainee), active/inactive
- Manage as a CRUD (Add/edit/delete banders)
- Drives dropdowns on Session and BandingRecord forms
- Initially seeded with known banders; extensible

**9c. Weather & Effort Tracking**
- Session: open and close weather readings (WeatherReading entity)
  - Temperature (C), Wind (Beaufort/mph), Cloud Cover (%), Precipitation (enum)
- SessionNetLog: per-net effort tracking
  - Which nets opened (from location inventory)
  - Open/close time per net (may differ from session times)
  - Remarks per net (wind, predators, low temps, etc.)
- Auto-calculated: net-hours per net and total session effort

**9d. Session list & summary**
- Session list view: date, location, protocol, master bander, record count
- Session detail: edit form, linked banding records, session-level stats (new/unbanded/recaptured counts from records)

---

## Phase 10 — Validation (Soft Warnings)

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

## Phase 11 — Band Inventory

Goal: Band lifecycle management per BBL requirements.

- Add bands by series (prefix + suffix range, band size, type)
- Inventory overview: deployed vs remaining by size + type
- Band number dropdown on banding form (replaces free text)
- Auto-update band status on record submission (set to "deployed" on New; track recaptures)
- Foreign recapture detection (band not in inventory)
- Band history view (future: click band → encounter timeline)
- Integration with BandingRecord: link band_number FK

---

## Phase 12 — Cloud Sync & Auth

Goal: Move from offline-only to synced multi-user.

**12a. Multi-tenant data model**
- Organization as top-level unit (already modeled)
- User entity for authentication (email + password via Supabase Auth)
- Bander entity links Person → Organization
- Record-level filters by organization (row-level security)

**12b. Supabase integration**
- Postgres backend for Organization, Person, User, Bander, Location, Session, Net, SessionNetLog, SessionBanderLog, WeatherReading, BandingRecord, Band (Species and CodeTable remain static resource files, not DB tables)
- Auth: email or Google (Supabase Auth)
- Data sync: local IndexedDB ↔ Supabase (conflict resolution TBD)

**12c. API & SDKs**
- Auto-generate API (OpenAPI or GraphQL) from Postgres schema
- Supabase client SDK (supabase-js) for real-time subscriptions (optional future)
- No SSR — client-side rendering only

---

## Phase 13 — Agency Export

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
- Photo capture attached to records with labels (WING, TAIL, HEAD — combobox)
- Photo log / visual database with auto-named exports
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

**Platform**
- Report bugs / give feedback mechanism
- Color band resighting data collection
- Bander Location ID reconciliation (app code vs BBL code)
- Admin dashboard (org management, user role assignment, data import/export)
- Session results rollups (New/Unbanded/Recaptured/Daily Total/Year Total) as derived metrics on session summary; Phase 5c/5d UI feature, not a data model change
- Protocol-specific forms and validations (Mist-netting, Trapping, Nest-box Monitoring, Rehabbed-Bird, etc.)
- Per-net/trap/nest metadata (type, coordinates within location, additional type-specific fields)
- Session effort remarks presets (closed early due to wind/predators, opened late due to temp, etc.)
- Rehab records: capture location vs release location (record both or allow override)
- Band history: link band replacement/additional band events to the band timeline

**Branding**
- Vector art from bird drawings/photos for icons, splash, UI

**Open Decisions** — See [product-specifications.md § 8](product-specifications.md#8-open-decisions--todos) for the canonical list of unresolved design decisions (data model, UX, code systems).
