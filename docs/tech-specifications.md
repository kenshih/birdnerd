# BirdNerd — Technical Specification

See also: [product-specifications.md](product-specifications.md) | [entities.md](entities.md) | [plan.v3.md](plan.v3.md)

---

## 1. Architecture Overview

```
+--------------------+     +--------------------+     +--------------------+
|   Home Screen      |     |   Session Module   |     |   Banding Data     |
|   (navigation hub) |---->|   (session CRUD,   |---->|   Collection       |
|                    |     |    effort, weather) |     |   (main form)      |
+--------------------+     +--------------------+     +--------------------+
        |                                                      |
        v                                                      v
+--------------------+     +--------------------+     +--------------------+
|   Location Manager |     |   Band Inventory   |     |   Export / Reports |
|   (project sites)  |     |   (band lifecycle)  |     |   (CSV, BBL, IBP)  |
+--------------------+     +--------------------+     +--------------------+
```

### Technology Stack

- **Frontend:** React 19 + TypeScript + Vite (client-side rendering only, no SSR ever)
- **PWA:** vite-plugin-pwa (offline capability, installable, home screen icon)
- **Forms:** React Hook Form + validation library (TBD)
- **Local Storage:** IndexedDB (via `idb` package)
- **Database (future):** Supabase (PostgreSQL + Auth)
- **API (future):** Generated from schema (OpenAPI or GraphQL TBD)
- **Hosting:** GitHub Pages (static)

### Development Environment

- **Node.js:** v18+ (LTS recommended)
- **Package Manager:** npm or yarn
- **Build Tool:** Vite with TypeScript support
- **Testing:** Vitest + React Testing Library (planned Phase 3+)
- **Linting/Formatting:** ESLint + Prettier (recommended)

---

## 2. Data Model

The complete data model with 14 entities organized by category. See [entities.md](entities.md) for ER diagram and color conventions.

### Entity Categories

- **Pink (Operational):** Organization, Person, User, Bander, Location, Net, Band, BandingRecord
- **Orange (Session):** Session, SessionNetLog, SessionBanderLog, WeatherReading
- **Green (Reference):** Species, CodeTable — static resource files, not DB tables (no FK relationships)
- **White (Immutable):** ChangeLog

### Core Entities

#### Organization
- **id** (string, PK)
- **name** (string)
- **created, updated** (datetime)

#### Person
- **id** (string, PK)
- **name** (string)
- **initials** (string, 2-3 char)
- **created, updated** (datetime)

#### User
- **id** (string, PK)
- **person_id** (FK to Person)
- **email** (string, unique)
- **display_name** (string)
- **created, updated** (datetime)

#### Bander
- **id** (string, PK)
- **person_id** (FK to Person)
- **organization_id** (FK to Organization)
- **role** (enum: Master Bander, Sub-permittee, Bander, Trainee)
- **active** (boolean, default: true)
- **created, updated** (datetime)

#### Location
- **id** (string, PK)
- **bander_location_id** (string, 4-letter code)
- **bbl_location_id** (string, 6-letter, nullable)
- **name** (string)
- **latitude, longitude** (number, decimal degrees)
- **country, state_province** (string)
- **remarks** (string)
- **created, updated** (datetime)

#### Session
- **id** (string, PK)
- **location_id** (FK to Location)
- **session_date** (date, ISO format)
- **protocol** (enum: MAPS, Non-MAPS, Burrowing Owl, Rehabbed-Bird, Saw-whet Owl, etc.)
- **maps_period** (number, 1-10, nullable)
- **master_bander_id** (FK to Bander)
- **weather_open_id, weather_close_id** (FK to WeatherReading)
- **open_time, close_time** (datetime)
- **notes** (string)
- **created, updated** (datetime)

#### Net
- **id** (string, PK)
- **location_id** (FK to Location)
- **label** (string, e.g., "N-01", "Trap-A")
- **created, updated** (datetime)

#### SessionNetLog
- **id** (string, PK)
- **session_id** (FK to Session)
- **net_id** (FK to Net)
- **remarks** (string, nullable)
- **open_time, close_time** (datetime, nullable)
- **created, updated** (datetime)

#### SessionBanderLog
- **id** (string, PK)
- **session_id** (FK to Session)
- **bander_id** (FK to Bander)
- **created, updated** (datetime)

#### WeatherReading
- **id** (string, PK)
- **reading_type** (enum: "session_open", "session_close")
- **temperature** (number, Celsius)
- **wind** (number, Beaufort/mph)
- **cloud_cover** (number, 0-100 percent)
- **precipitation** (enum: clear, fog, thick fog, drizzle, rain, snow)
- **created, updated** (datetime)

#### Band
- **id** (string, PK)
- **band_number** (string, unique, format: XXXX-XXXXX(X))
- **status** (enum: available, deployed, destroyed, lost, replaced)
- **band_size** (number, e.g., 1.6, 2.0, 2.5)
- **band_type** (string, e.g., "Standard", "Buffy", "Giant")
- **current_species** (string, ALPHA code, nullable)
- **deployment_date** (date, ISO, nullable)
- **created, updated** (datetime)

#### BandingRecord
- **id** (string, PK)
- **session_id** (FK to Session)
- **band_number** (string or "UNBANDED", FK to Band)
- **species_code** (string, 4-letter alpha code — validated against static Species list, not a DB FK)
- **capture_code** (enum: 1/N, U, R, F, 4, 5, 6, 8, X)
- **age** (enum: U, L, HY, AHY, SY, ASY, TY, ATY)
- **how_aged** (string, 25-code set)
- **how_aged2** (string, nullable)
- **wrp** (string, ~120-code molt cycle)
- **sex** (enum: M, F, U)
- **how_sexed** (string, 18-code set)
- **how_sexed2** (string, nullable)
- **Condition fields:** skull, brood_patch, cloacal_protuberance, fat, body_molt, ff_molt, ff_wear, juv_body_plumage (all enums)
- **Molt Limits fields:** p_covs, s_covs, pp, ss, tert, rec, body_plum, non_feather (all enums: J, L, F, B, R, M, A, N, U)
- **Morphometrics:** wing, tail (mm, whole), tarsus (mm, ##.##), exposed_culmen (mm, ##.##), other_measurement (mm, ##.##), body_mass (g, ##.#)
- **status** (string, composite code: 300, 318, 500, 700, etc.)
- **disposition** (enum: M, O, I, S, E, T, W, B, L, P, D)
- **bander_id** (FK to Bander)
- **capture_time, release_time** (string, HH:mm)
- **net_id** (FK to Net)
- **notes** (string)
- **feather_pull, blood_sample** (boolean, defaults: false)
- **created, updated** (datetime)

#### Species
- **id** (string, PK)
- **alpha_code** (string, 4-letter unique code)
- **species_name** (string, common name)
- **sci_name** (string, scientific name)
- **french_name, spanish_name** (string)
- **created, updated** (datetime)

**Source:** MASTER BANDING DATA.xlsx → SPECIES sheet (1,323 species)
**Replace:** Current placeholder CA list with full BBL-authoritative list

#### CodeTable
- **id** (string, PK)
- **code_type** (string, lookup category: Age, Sex, Capture Code, How Aged, How Sexed, Bird Status, How Captured, WRP, Hummingbird Band Prefixes, Molt Limits & Plumage)
- **code** (string, the code value)
- **description** (string, human-readable description)
- **created, updated** (datetime)

**Source:** MASTER BANDING DATA.xlsx → LOOKUPS sheet
**Stored as:** Static reference data in app

#### ChangeLog
- **id** (string, PK)
- **created** (datetime, only timestamp — no updated field)
- **person_id** (string, nullable, FK to Person)
- **change_type** (enum: "created", "updated", "deleted")
- **entity** (string, entity name affected)
- **detail** (json, full change set with fields and old/new values)

**Nature:** Append-only, immutable. Rows inserted only, never updated or deleted.

### Database Conventions

1. **Primary Key:** Every entity has a string `id` field as primary key.
2. **Standard Timestamps:** Operational and reference entities have:
   - `created` (datetime): Set on insert
   - `updated` (datetime): Updated on any modification
3. **Immutable Entries:** Audit tables (like ChangeLog) have only `id` and `created` — no `updated` field.
4. **Future Tables:** New entities must follow these conventions: `id` + (`created`/`updated` or just `created`).

These support:
- Audit trails and change tracking
- Conflict resolution in multi-user sync
- Data integrity validation

---

## 3. Code Systems & Mappings

### IBP vs BBL Storage Strategy

The master spreadsheet reveals that many fields have **IBP** and **BBL** code variants:

- How Aged: IBP single-letter (C, S, P, etc.) ↔ BBL 2-letter (CL, SK, PL)
- Body Molt: IBP numeric (0-4) ↔ BBL Y/N
- FF Molt: IBP letter (N, A, S, J) ↔ BBL Y/N
- Code: IBP alpha (N, D, R, F) ↔ BBL numeric (1, 4, etc.)

**Decision:** Store data in richer IBP format internally. Derive BBL format at export via mapping tables. Mappings documented in LOOKUPS sheet and spreadsheet formulas.

### Code Tables

All imported from MASTER BANDING DATA.xlsx → LOOKUPS sheet:

- **Age codes** (8 codes + valid age pairings)
- **Sex codes** (3 codes)
- **Capture Code** (10 variants)
- **How Aged** (19 codes from Hallie's curated set: BP, CC, CL, EG, EY, FB, FF, IC, LP, MB, MR, NA, NF, NL, NN, PL, RC, SK, OT)
- **How Sexed** (11 codes: BP, CC, CL, EG, EY, MB, NA, PL, TL, WL, OT)
- **Bird Status** (300, 301, 318, 319, 333, 334, 380, 500, 700, "---", Other)
- **How Captured** (25 methods)
- **WRP Molt Cycle** (57 codes from Hallie's station subset + Other; not full ~120)
- **Hummingbird Band Prefixes** (prefix → alpha mapping)
- **Molt Limits & Plumage** (J, L, F, B, R, M, A, N, U)

### Seed Data

All seed/default data is centralized in a single config file (`src/data/seed.ts`). This includes pre-populated locations, nets, people, banders, and any other reference data the app ships with. The seed file can be swapped for an empty config to start fresh (e.g., for new organizations or testing). In Phase 9, seed.ts will be replaced by a bundled JSON data file in the same format as the export bundle, making seed data runtime-swappable rather than build-time only.

---

## 4. Offline & Sync Strategy

### Local Storage (IndexedDB)

- All entities cached locally in IndexedDB
- Supports offline operation in field
- `created` and `updated` timestamps enable conflict resolution

### Cloud Sync (Phase 8+)

- Supabase PostgreSQL backend
- Sync from IndexedDB → Supabase when online
- Conflict resolution: Last-write-wins or user-resolved (TBD)
- Row-level security by Organization (multi-tenant)

### Data Validation Datasets (future)

Tables provided by domain experts for validation:
- Species × Band size mapping
- Species × Wing range
- Species × Tail range
- Species × Tarsus range
- Species × Culmen range
- Species × Mass range

---

## 5. API & Integration (Future)

### OpenAPI / GraphQL (Phase 8+)

- Auto-generate from Postgres schema
- REST and/or GraphQL endpoints
- Real-time subscriptions via Supabase (optional)

### Client Libraries

- **Supabase JS** for authentication and real-time sync
- Custom hooks for data fetching and mutation
- Conflict resolution layer for multi-user scenarios

### Rate Limiting & Quotas

- TBD based on deployment model

---

## 6. Migration & Data Import

### CSV Import (Sessions & Banding Records)

Current capability:
- Read CSV, validate columns, insert into local IndexedDB
- Basic error reporting
- Independent export/import per session or all sessions

### JSON Data Bundle (Phase 9)

A single JSON file that contains all managed reference and operational data, providing portable backup/restore before Postgres arrives.

**Included entities (growing with each phase):**
- Locations, Nets (Phase 9)
- People, Banders (Phase 9)
- Sessions, BandingRecords (Phase 9)
- Bands (added in Phase 12)
- Future entities added as they are built

**Not included:** Code tables and species list (static app resources, not user data).

**Format:** JSON with a version field and per-entity arrays:

```json
{
  "version": 1,
  "exportedAt": "2026-03-21T...",
  "locations": [...],
  "nets": [...],
  "people": [...],
  "banders": [...],
  "sessions": [...],
  "records": [...]
}
```

**Use cases:**
- **Backup/Restore:** Export all data before schema migrations or device changes
- **Seed data replacement:** The app's seed.ts config will be replaced by a bundled JSON file in this format, making seed data swappable at runtime rather than build time
- **Pre-Postgres persistence:** With a single user, export JSON as the portable data store between sessions/devices
- **Data migration:** Import into Postgres when cloud sync arrives (Phase 13)

**Import behavior:**
- On import, prompt user to merge or replace existing data
- Validate version compatibility before importing
- Preserve existing CSV import/export for banding records (simpler workflow for session-level data exchange)

### Future: BBL & Legacy Data

- Import full band lists from BBL exports
- Reconcile with app's internal band numbers
- Handle location code mapping (app local code vs BBL code)

---

## 7. Deployment & DevOps

### Current (Phase 1-2)

- GitHub Pages static hosting
- Client-side rendering only (no Node.js backend required)

### Future (Phase 8+)

- Supabase project (includes Postgres, Auth, Storage)
- Environment variables for API endpoints, auth keys
- Database migrations via Supabase CLI or custom scripts
- Optional: CI/CD pipeline (GitHub Actions) for testing and deployment

### Monitoring & Logging

- Browser console + client-side error boundaries
- Future: Sentry or similar for error tracking
- Future: Analytics for usage patterns

---

## 8. Security & Privacy

### Current Phase

- Local-only data (no network transmission)
- No authentication required

### Future (Phase 8+)

- Supabase Auth (email/password, Google OAuth)
- Row-level security policies (by Organization)
- HTTPS only
- Data encryption in transit
- PII considerations (Person, User records)

### Compliance

- TBD: HIPAA, FDA 21 CFR Part 11 requirements (if applicable)
- Data retention policies
- Audit logging (via ChangeLog)

---

## 9. Performance & Optimization

### Caching

- IndexedDB as local cache (all entities)
- Species and CodeTable loaded from static resource files (not synced from DB)

### Pagination

- Session and BandingRecord lists: Implement pagination (50-200 records per page)
- Lazy-load morphometrics validation ranges

### Code Splitting

- Future: Lazy-load modules by phase (location mgmt, band inventory, export views)

---

## 10. Known Limitations & Technical Debt

- **Status quo:** No computed fields in IndexedDB; client-side aggregation for effort totals
- **Future refactor:** Consider splitting Session schema into separate multi-tenant workspace
- **Band number formats:** Internal storage format (string) to be finalized (numeric vs. formatted)
- **Auxiliary band markers:** Not yet designed; needed for complex band scenarios
