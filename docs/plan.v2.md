# BirdNerd — Plan v2

Informed by plan.v1 (Phases 1-2 complete) and the product specification derived from Hallie's vision document, the banding metadata sheet, and the master banding spreadsheet.

See also: [product-specifications.md](product-specifications.md) | [research-notes.md](research-notes.md) | [plan.v1.md](plan.v1.md)

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

---

## Phase 3 — Expand the Banding Form

Goal: Bring the banding data collection form to full spec coverage. This is where banders spend 90% of their time.

**3a. Add missing fields to BandingRecord**
- Tail (mm), Tarsus (mm ##.##), Exposed Culmen (mm ##.##), Other measurement (mm ##.##)
- Release Time (hh:mm with tap-to-fill-now button)
- WRP molt cycle code (dropdown from full WRP code list)
- Juvenile Body Plumage (0-3)
- Molt Limits & Plumage table (PCovs, SCovs, PP, SS, Tert, Rec, Body Plum, Non-Feather)
- Disposition (M, O, I, S, E, T, W, B, L, P, D)
- Feather Pull (checkbox)
- Blood Sample (checkbox)
- How Aged secondary, How Sexed secondary
- Other measurement requires note

**3b. Upgrade code tables from LOOKUPS**
- Replace placeholder code tables with full BBL/IBP code sets from MASTER BANDING DATA.xlsx LOOKUPS sheet
- How Aged: 25 codes with descriptions and valid-age pairings
- How Sexed: 18 codes with descriptions
- WRP: ~120 codes with descriptions
- Capture Status / Code: full set (1, U, R, F, 4, 5, 6, 8, X)
- Fat: expand to 0-7 (currently 0-5 + T)
- Bird Status codes (base + additional info composites)
- Disposition codes
- Molt Limits & Plumage codes (J, L, F, B, R, M, A, N, U)

**3c. Replace species list**
- Import full 1,323-species BBL list from SPECIES sheet (ALPHA_CODE, SPECIES_NAME, SCI_NAME)
- Keep autocomplete UX (type code or name)

**3d. Form UX improvements**
- Section grouping per spec: Identity → Age & Sex → Condition → Molt Limits → Morphometrics & Status → Additional Info
- Combobox upgrade for fields with known code sets (How Aged, How Sexed, etc.) — show code + description
- Release Time "tap to fill now" button

---

## Phase 4 — Session Data Expansion

Goal: Build out session metadata to match the Banding Metadata Sheet.

- Protocol field (dropdown: MAPS, Non-MAPS, etc.)
- MAPS Period
- Master bander selection + bander roster per session → drives bander dropdown on records
- Bander registry (initials, name, role) — stored locally, manageable
- Net effort tracking: which nets opened, open/close times per net, remarks per net
- Auto-calculated net hours
- Weather data: Open and Close readings (temp C, wind Beaufort, cloud %, precipitation)
- Session notes/observations
- Session results summary (auto-populated from linked records: new/unbanded/recaptured counts)

---

## Phase 5 — Validation (Soft Warnings)

Goal: Implement priority validation rules (red items from Hallie's doc).

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

---

## Phase 6 — Band Inventory

Goal: Band lifecycle management per BBL requirements.

- Add bands by series (prefix + suffix range, band size, type)
- Inventory overview: deployed vs remaining by size + type
- Band number dropdown on banding form (replaces free text)
- Auto-update band status on record submission
- Foreign recapture detection (band not in inventory)
- Band history view (future: click band → encounter timeline)

---

## Phase 7 — Project Location Manager

Goal: CRUD for banding locations.

- Bander Location ID (4-letter code)
- BBL Location ID (added after BBL issues it)
- Name, coordinates, country, state
- Bander remarks
- Location dropdown on session form (replaces current station picker)

---

## Phase 8 — Cloud Sync & Auth

Goal: Move from offline-only to synced multi-user.

- Supabase integration (Postgres + Auth)
- Login (email or Google)
- Data sync: local IndexedDB ↔ Supabase
- Conflict resolution strategy
- Multi-tenant data model (Organization as top-level)
- Row-level security by organization
- API: generated from schema (OpenAPI or GraphQL TBD)
- No SSR — client-side rendering only

---

## Phase 9 — Agency Export

Goal: Export in agency-specific formats.

- BBL upload format (58 columns, with IBP→BBL code mappings)
- BBL recapture upload format (60 columns)
- IBP format
- CDFW format
- Code translation layer (IBP codes stored internally → BBL/agency codes at export)

---

## Backlog (unordered — to be phased later)

**Media**
- Photo capture attached to records with labels (WING, TAIL, HEAD — combobox)
- Photo log / visual database with auto-named exports
- Speech-to-text (STT) input for field entry

**Advanced Validation**
- Morphometrics × species range validation (wing, tail, tarsus, culmen, mass — tables from Hallie)
- Status × Disposition cross-validation
- Cross-field self-validation (contradicting data across categories)
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
- Scientific name / definition lookup (fold in existing app)
- Lighter "in-the-field" utility mode

**Platform**
- Report bugs / give feedback mechanism
- Color band resighting data collection
- Bander Location ID reconciliation (app code vs BBL code)

**Branding**
- Vector art from bird drawings/photos for icons, splash, UI
