# BirdNerd — Product Specification

**See also:** [tech-specifications.md](tech-specifications.md) (architecture, database schema, implementation details) | [entities.md](entities.md) (ER diagram) | [../../plan.md](../../plan.md) (development roadmap)

---

## 1. Product Vision

BirdNerd is a progressive web app for bird banders to collect, manage, and export banding data in the field and back in the office. It serves as a **band deployment manager** — data is anchored around USGS BBL-issued band numbers, with sessions providing contextual metadata for each encounter.

**Primary users:** Bird banders at field stations following MAPS/IBP protocols.
**Primary devices:** iPhone, iPad. Android supported.
**Key constraint:** Must work offline in the field with no connectivity. Sync when online.

---

## 2. Core Modules

**Home Screen** — Navigation hub with access to all features.

**Session Module** — Create and manage banding sessions (location, date, protocol, weather, effort tracking).

**Banding Data Collection** — Primary form for recording individual bird encounters (90% of field time). Includes **Photo Capture** — take photos of birds via the device camera, auto-name them from the record context (date, station, band number, species, body part label), and share to Google Drive or other storage via the Web Share API (desktop: file download fallback). Photos are stored as blobs in IndexedDB with metadata in a `PhotoRecord` entity (body_part, file_name) linked to the banding record.

**Location Manager** — CRUD for project locations and associated nets.

**Band Inventory** — Add, track, and manage band stock.

**Data Manager** — Browse records, export session data (CSV, BBL, IBP), generate session summaries, view band history. JSON data bundle for full backup/restore of all managed data (locations, nets, people, banders, sessions, records).

---

## 3. Screens & User Experience

For comprehensive screen layouts, wireframes, and interaction patterns, see [ux-specifications.md](ux-specifications.md).

---

## 4. Data Model Summary

The app uses **14 core entities** organized by function: operational (field station data), session (banding session data), reference (static lookups), and immutable (audit log).

For the ER diagram, complete field definitions, and entity relationships, see [tech-specifications.md § 2 Data Model](tech-specifications.md#2-data-model) and [entities.md](entities.md).

### 4.1 Entity Overview

**Operational (Pink):** Organization (top-level tenant), Person (human base), User (login), Bander (person + organization + role), Location (field station), Net (physical net), Band (USGS band), BandingRecord (encounter/capture event), PhotoRecord (photo metadata + blob).

**Session (Orange):** Session (daily banding session with flattened weather fields), SessionNetLog (per-net effort tracking), SessionBanderLog (bander participation).

**Reference (Green):** Species (1,323 species from USGS BBL), CodeTable (120+ code lookups — age, sex, molt, status, how-aged, how-sexed, capture methods, etc.).

**Immutable (White):** ChangeLog (append-only audit trail of all entity changes).

### 4.2 Key Product Concepts

**Band Inventory & Status:** Each band from BBL has a lifecycle: `available` → `deployed` (assigned to bird) → recaptured, replaced, destroyed, lost, or retired. The app tracks current status and deployment date.

**Foreign Recaptures:** When a bander encounters a bird wearing a band not in our inventory (issued by another station/permit), the record stores the band number as free text with no FK to the Band entity (`bandId` is null). Capture Code is forced to `F` (Foreign). The band number is preserved for BBL recapture reporting but no Band record is created — we never manage another permit's bands.

**Bander Registry:** Banders are linked to an organization with a role (Master Bander, Sub-permittee, Bander, Trainee) and active status. This enables selective participation in sessions and role-based validation rules.

**Session Structure:** A session (date + location + protocol) contains multiple nets and involves multiple banders. Each net's effort is logged separately (times, remarks), and bander participation is tracked. This supports flexible crew composition and differential effort calculation.

**Validation Datasets (Future):** We will provide species-specific ranges for morphometrics (wing, tail, tarsus, etc.) and code consistency rules to flag unusual combinations (e.g., HY adult molt codes, season/sex mismatches).

### 4.3 Database Conventions

1. **Primary Key:** All entities use `id` (string) as primary key.
2. **Audit Timestamps:** Operational and reference entities have `created` (insertion time) and `updated` (modification time). This supports change tracking and conflict resolution for offline sync.
3. **Immutable Tables:** ChangeLog has only `id` and `created` (no `updated`). New records document changes; records are never deleted or modified.
4. **Future Tables:** Any additions must follow the same convention.

---

## 5. Validation Rules

### 5.1 Priority Validations (red in doc — implement early)

| Rule | Trigger | Behavior |
|------|---------|----------|
| Code × Band history | Recaptured band selected as New, Destroyed, or Band Lost | Warning |
| New band × Inventory | New band must pair with unused/available band number | Warning |
| Species × Band size | Band size doesn't match standard for species | Warning with override: "Did you gauge the leg?" → auto-note "Leg gauged" |
| Sex=M + BP 3-4 | Male with Heavy/Wrinkled brood patch | Warning |
| Sex=F + CP 1-3 | Female with any cloacal protuberance | Warning |
| SK in How Aged + no Skull | Skull used for aging but skull field empty | Warning: skull entry expected |
| Age=U → How Aged | How Aged not needed | Make How Aged optional |
| Sex=U → How Sexed | How Sexed not needed | Make How Sexed optional |
| How Aged/Sexed = OT | "Other" selected | Warning: note expected |
| Status 500 | Sick/Injured/Stressed | Warning: disposition + note expected |
| Status "---" or Other | Mortality or Other | Warning: note expected |
| Blood Sample + Status | Blood sample checked | Warn if Status is missing or not 318/319/334 |
| Morphometrics × Species | Wing/Tail/Tarsus/Culmen/Mass outside known range | Warning (soft) |

### 5.2 Future Validations (blue in doc)
- Status × Disposition cross-validation
- Self-validation across contradicting data in multiple categories
- Season × species × age/sex/molt consistency

### 5.3 Validation Philosophy
- **Soft warnings only** — birds escape, partial records are valuable. Never block save.
- **Inline display** — warnings/errors appear under the relevant field, live as the user fills the form
- **Override mechanism** — future consideration (see backlog). Originally from Hallie's doc for Species × Band size ("Did you gauge the leg?" → auto-note). May not be needed for other validations.
- **Required fields** marked with * are enforced at submission time, not during entry

---

## 6. Dual Code Systems (IBP vs BBL)

The master spreadsheet reveals a critical complexity: many fields have **IBP** and **BBL** variants with different code systems. The spreadsheet uses formulas to convert between them.

Examples:
- How Aged IBP uses single letters (C, S, P, etc.) → How Aged BBL uses 2-letter codes (CL, SK, PL)
- Body Molt IBP is numeric (0-4) → Body Molt BBL is Y/N
- FF Molt IBP is letter (N, A, S, J) → FF Molt BBL is Y/N
- Code IBP (N, D, R, F, etc.) → Code BBL is numeric (1, 4, etc.)

**Decision (implemented):** Data is stored in IBP format internally. BBL format is derived via mapping tables at export time. For full mapping details, see [tech-specifications.md § 3](tech-specifications.md#3-code-systems--mappings).

---

## 7. People & Roles

People are the base entity for anyone involved in station operations. Roles (Bander, Extractor, Data Entry, etc.) are assigned via association tables, not baked into the Person record. This allows the same person to hold multiple roles and for the system to evolve beyond banding-specific workflows.

**Person record:**
- Initials (2-3 letter, used in data: HD, TS, etc.)
- Full name
- Active/inactive

**Bander role (via Bander association table):**
- Links Person → Organization
- Role: Master Bander, Sub-permittee, Bander, Trainee
- Drives bander dropdowns on Session and BandingRecord forms

**Future roles** (not yet implemented):
- Extractor, Data Entry, Scribe, Researcher, etc.

**Current known people (seed data):**
- HD — Hallie Daly (Master Bander)
- JW — Julie Woodruff (Sub-permittee)
- TS — Tatyana Soto-Bartzi (Sub-permittee)
- JVD — Joanna van Dyk (Sub-permittee)
- LC — Lucas Corneliussen (Sub-permittee)

---

## 8. Open Decisions & TODOs

This is the **canonical list** of unresolved design decisions and outstanding TODOs. All other docs should point here rather than maintaining their own lists.

### 8.1 Data Model

- [ ] Reconsider whether `master_bander_id` should remain a FK on Session, or if all session leaders should be pulled from SessionBanderLog
- [x] Band number format: Formatted with hyphen (1154-81501) — resolved
- [ ] BBL upload-only fields: decide which become first-class BandingRecord fields vs derived/export-only
- [ ] Capture details: add `how_captured`, `scribe`, `banded_leg`, `eye_color`, `weight_time`?
- [ ] Bill measurements: add `bill_length`, `bill_width`, `bill_height` (BBL upload has these in addition to culmen)?
- [x] Recapture fields: `present_condition`, `replaced_band_number` for Phase 13b. Deferred to backlog: `how_obtained` (BBL reporting detail, not needed at capture time). Dropped: `second_band_number` (redundant with our new band), `reward_band_number` (waterfowl/game bird concern, not MAPS)
- [ ] Nest/effort fields: add `net_nest_cavity_designator`, `net_nest_cavity_number`, `plot_id`, `sweep_number`, `nest_location`?
- [ ] Sampling/tests fields: add `genetic_sample`, `other_tests`, `tracheal_swab`, `mouth_swab`, `cloacal_swab`, `ectoparasites_present`, `ectoparasites_collected`?
- [ ] User-defined fields: support BBL `User Field 1-5`, or map to notes/extra metadata?

### 8.2 UX & Workflow

- [ ] Audit all delete actions for cascade confirmation dialogs (see ux-spec § 1.2): Session, Location, Person — any entity with dependents should explain what gets deleted
- [ ] Remove "Load Example Data (for Hallie)" button from Data Manager once real data is in use
- [ ] JSON import merge mode: Currently replace-only; consider additive merge strategy for importing bundles without wiping existing data
- [ ] Status code UX: Present as composite (300, 318, 500) or let users build from base + additional info?
- [ ] Required fields timing: When to start enforcing * required fields? (Validation phase complete — currently all soft warnings, no hard enforcement)
- [ ] Empidonax / Selasphorus special forms: What do these look like? When to implement?
- [ ] Lindsay Wildlife / rehabbed birds: Location is where banded but record should reflect release location. Separate field? Note?
- [ ] Status not required for unbanded birds (Hallie: "do NOT require Status entry if unbanded")
- [ ] Protocol dropdown values: MAPS, Non-MAPS, Burrowing Owl Banding, Rehabbed-Bird Banding, Saw-whet Owl Banding (from Hallie's doc)

### 8.3 Infrastructure

- [ ] **Schema migration strategy:** Formalize versioned migration runner for IndexedDB with corresponding Postgres migrations. See plan.md backlog.
- [ ] **Multi-tenancy / Organization support:** When Organization entity becomes a first-class concept, update JSON bundle file naming convention to include org code (e.g., `birdnerd-GCBS-2026-03-21.json` instead of `birdnerd-2026-03-21.json`)

### 8.4 Resolved

- [x] Galindo Creek location code: **GCBS** (Galindo Creek Banding Station) confirmed as the 4-letter code
- [x] Personnel → Bander ID mapping: Bander registry with initials + full name + role (implemented in Phase 7)
- [x] Net/Trap linking: Nets defined at location level, referenced in SessionNetLog per session, banding records reference net via FK
- [x] Add `role` and `active` fields to Bander entity (implemented in Phase 7 — Person has `active`, Bander has `role`)
- [x] Bander ID format on records: 2-3 letter initials stored, dropdown shows initials + full name (implemented in Phase 7/8)
- [x] Session ↔ Banding linkage: Session station auto-populates banding form, net dropdown from session's location nets (implemented in Phase 8)
- [x] Session ID display on banding form: shows station code + date, not raw ID (implemented in Phase 8)
- [x] IBP vs BBL storage: Store IBP internally, derive BBL at export (decided, coded in Phase 5)
- [x] Net soft-delete: Use `active: boolean` instead of hard delete. Inactive nets hidden from session setup, preserved in historical data. Same pattern as Person.active.
- [x] SessionNetLog dense model: Auto-generate a log entry for every active net on session create, pre-filled with session open/close times. Banders only edit exceptions. Enables accurate net-hours for MAPS reporting.
- [x] Precipitation: Combobox (free text or pick from suggestions: clear, fog, thick fog, drizzle, rain, snow). Not constrained to enum.
- [x] Blood Sample validation: Resolved — warns if Status is missing or not 318/319/334 (implemented in Phase 15.5)
