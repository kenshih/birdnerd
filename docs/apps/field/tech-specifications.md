# BirdNerd — Technical Specification

See also: [product-specifications.md](product-specifications.md) | [entities.md](entities.md) | [../../plan.md](../../plan.md)

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
- **Forms:** React Hook Form + custom validation (`apps/field/src/utils/validation.ts`)
- **Local Storage:** IndexedDB (via `idb` package)
- **Shared Event exchange:** Supabase (PostgreSQL + Auth + narrow RPCs)
- **API:** Explicit Event claim/append/pull RPCs; broader OpenAPI or GraphQL remains future work
- **Hosting:** GitHub Pages (static)

### Development Environment

- **Node.js:** v18+ (LTS recommended)
- **Package Manager:** npm or yarn
- **Build Tool:** Vite with TypeScript support
- **Testing:** Vitest + fake-indexeddb (87 tests). E2E: Playwright (backlogged)
- **Linting/Formatting:** ESLint + Prettier (recommended)

---

## 2. Data Model

The complete data model with 14 entities organized by category. See [entities.md](entities.md) for ER diagram and color conventions.

### Entity Categories

- **Pink (Operational):** Organization, Person, User, Bander, Location, Net, Band, BandingRecord
- **Orange (Session):** Session (includes flattened weather), SessionNetLog, SessionBanderLog
- **Green (Reference):** Species, CodeTable — static resource files, not DB tables (no FK relationships)
- **White (Immutable):** ChangeLog

### Session as Context Container

A Session is the parent container for banding records. From the perspective of a BandingRecord, all session-level data — location, nets (via SessionNetLog), participating banders (via SessionBanderLog), weather, open/close times — is part of its inherited context, not a separate concern. The banding form freely references session-scoped data (e.g., net dropdown filtered to nets in the session's effort log, bander dropdown from session participants) without crossing a boundary. Nets and bander logs are siblings to banding records within the session, but from the record's local viewpoint they are contextual metadata provided by the session parent.

This means components rendering or validating a BandingRecord can load session-level entities (SessionNetLog, SessionBanderLog, Location, Net) as ambient context rather than treating them as foreign data.

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
- **open_time, close_time** (datetime)
- **open_temp, close_temp** (number, Celsius, nullable)
- **open_wind, close_wind** (number, Beaufort scale, nullable)
- **open_cloud_cover, close_cloud_cover** (number, 0-100 percent, nullable)
- **open_precipitation, close_precipitation** (string, nullable — combobox: free text or pick from suggestions: clear, fog, thick fog, drizzle, rain, snow)
- **notes** (string)
- **created, updated** (datetime)

#### Net
- **id** (string, PK)
- **location_id** (FK to Location)
- **label** (string, e.g., "N-01", "Trap-A")
- **active** (boolean, default: true) — soft-delete: inactive nets are hidden from session setup but preserved in historical data
- **created, updated** (datetime)

#### SessionNetLog

**Legacy mutable model:** On session create, auto-generate a log entry for every
active net at the location, pre-filled with session open/close times. Phase 31
does not carry this model into the operational Event Catalog; Net Hours will
reconsider it before any shared contract is frozen.

- **id** (string, PK)
- **session_id** (FK to Session)
- **net_id** (FK to Net)
- **open_time, close_time** (string, HH:mm — defaults to session open/close times)
- **remarks** (string, nullable — only when something out-of-the-ordinary happens)
- **created, updated** (datetime)

#### SessionBanderLog
- **id** (string, PK)
- **session_id** (FK to Session)
- **bander_id** (FK to Bander)
- **created, updated** (datetime)

#### Band
- **id** (string, PK)
- **band_number** (string, unique, format: XXXX-XXXXX or XXXX-XXXXXX — 4-digit prefix + hyphen + 5-6 digit suffix)
- **status** (enum: available, deployed, destroyed, lost, replaced)
- **band_size** (string, BBL size code: 0, 0A, 0B, 1, 1A, 1B, 1C, 1D, 2, 3, 3A, 3B, 4, 7, 7A, 7B, 8, 9)
- **band_type** (string: "Standard", "Buffy", "Giant", "Lockout") — TODO: confirm full list with Hallie
- **current_species** (string, ALPHA code, nullable)
- **deployment_date** (date, ISO, nullable)
- **created, updated** (datetime)

#### BandingRecord
- **id** (string, PK)
- **session_id** (FK to Session)
- **band_id** (string, FK to Band, nullable — null for UNBANDED and foreign recaptures)
- **band_number** (string, denormalized from Band for display; "UNBANDED" when no band; free-text foreign band number when capture_code = F)
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
- **Recapture fields (Phase 13b):** present_condition (string, nullable), replaced_band_number (string, nullable) — only saved when capture_code = R; discarded otherwise. `how_obtained` deferred to backlog
- **created, updated** (datetime)

#### PhotoRecord
- **id** (string, PK)
- **banding_record_id** (FK to BandingRecord)
- **body_part** (string; presets: WING, TAIL, HEAD, BODY, BAND + free text)
- **file_name** (string; auto-generated: `DAY_LOCCODE_BANDID_SPECIESCODE_BODYPART.ext`)
- **blob** (Blob; image data stored in IndexedDB, excluded from data bundle export)
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

### Agency Export Formats

Three export formats, all implemented in `apps/field/src/utils/agencyExport.ts`.

#### IBP (MAPS Master List) — 49 columns

Matches Hallie's MASTER sheet layout. Requires reverse-mapping from BBL → IBP for several fields:

| Field | App stores | IBP wants | Transformation |
|-------|-----------|-----------|----------------|
| How Aged / How Sexed | BBL 2-letter (CL, SK, PL…) | IBP 1-letter (C, S, P…) | `HOW_AGED_BBL_TO_IBP` / `HOW_SEXED_BBL_TO_IBP` lookup |
| Capture Code | BBL (1/N, 4, 8…) | IBP alpha (N, D, L…) | `CAPTURE_CODE_TO_IBP` lookup; both "1" and "N" → IBP "N" |
| Age | Numeric (1, 2, 4, 5…) | Alpha (AHY, HY, ASY, SY…) | `AGE_NUM_TO_ALPHA` lookup |
| Body Molt | IBP numeric (0–4) | _also_ BBL Y/N in separate column | `bodyMoltToBBL()`: 0→N, 1–4→Y |
| FF Molt | IBP letter (N, A, S, J) | _also_ BBL Y/N in separate column | `ffMoltToBBL()`: N→N, else→Y |
| Band Number | XXXX-XXXXX | XXXXXXXXX | Strip hyphen |
| Capture Time | HH:MM | Numeric (710) | Strip colon, parseInt |
| Bander | Bander FK ID | Initials | FK chain: bander → person → initials |
| Station | Session FK | Location code | FK chain: session → location → banderLocationId |
| Feather Pull / Blood Sample | boolean | Y/N | `boolToYN()` |

IBP export includes dual columns (IBP + BBL) for: Code, How Aged, How Sexed, Body Molt, FF Molt.

#### BBL Upload (New Bandings) — 58 columns

Matches the "BBL UPLOAD" sheet in Hallie's spreadsheet. Simpler than IBP because the app already stores most codes in BBL format. Only fields with data are populated; the remaining columns are left empty.

| Field | App stores | BBL wants | Transformation |
|-------|-----------|-----------|----------------|
| Body Molt | IBP numeric (0–4) | BBL Y/N | `bodyMoltToBBL()`: 0→N, 1–4→Y |
| FF Molt | IBP letter (N, A, S, J) | BBL Y/N | `ffMoltToBBL()`: N→N, else→Y |
| Band Number | XXXX-XXXXX | XXXXXXXXX | Strip hyphen |
| Capture Time | HH:MM | HH:MM | No conversion (unlike IBP numeric) |
| Feather Pull / Blood Sample | boolean | Y/N | `boolToYN()` |
| Bander | Bander FK ID | Initials | FK chain: bander → person → initials |
| Station | Session FK | Location code | FK chain: session → location → banderLocationId |

Hardcoded values: How Captured = "Mist net", Banded Leg = "R".

Empty columns (not collected): Reward Band Number, Scribe, Tail/Tarsus/Culmen/Bill measurements, Weight Time, Eye Color, Net/Nest/Cavity Designator & Number, Plot ID, Sweep Number, Nest Location, Genetic/Tracheal/Mouth/Cloacal samples, Ectoparasites, User Fields 1–5.

Only new bandings (bbpCode `1`) are included. Records with bbpCode `R`, `F`, `4`, etc. are excluded — recaptures go in the R UPLOAD format.

#### BBL Recapture Upload — 60 columns

Matches the "R UPLOAD" sheet. Nearly identical layout to BBL Upload with two extra columns (How Obtained, Present Condition) and renamed date/band columns.

| BBL Upload column | R Upload column | Notes |
|-------------------|-----------------|-------|
| Banding Year/Month/Day | Recapture Year/Month/Day | Same date field, different header |
| Replaced Band Number | Second Band Number | Maps from `replacedBandNumber` |
| _(not present)_ | How Obtained (col 11) | Hardcoded "Mist net" |
| _(not present)_ | Present Condition (col 12) | From `presentCondition` (H/I/S/D) |

Only recaptures (bbpCode `R`, `F`, `4`, `5`, `6`, `8`) are included.

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

Seed data ships as a JSON file (`apps/field/public/data/seed.json`) in the same format as the export bundle. On first launch (empty IndexedDB), the app loads this file to populate initial reference data (locations, nets, people, banders). The seed file can be swapped or emptied for new organizations.

---

## 4. Offline & Sync Strategy

### Local Storage (IndexedDB)

**Current implementation:** Field's default operational workflow uses the
separate `birdnerd-event-core` durable replica. It retains immutable Event
JSON, outbound queue/receipt/cursor metadata, and a rebuildable projection
cache separately; no legacy mutable store is read, migrated, or dual-written.
Stored historical Events retain their original representation. The
`WorkspaceEventStore` is the local-replica Adapter seam: every read, replay,
projection, and sync commit interprets supported historical Events through
`upcastEvent` before it reaches the Banding projection Module, without
rewriting Event identity or history. The Supabase exchange Adapter validates a
received Event at transport ingress but passes that raw JSON to this store; it
does not upcast before persistence. It also sends each pending Event from the
durable outbound queue in that same raw representation, including retries.
Workspace Event Bundle export, validation,
and restore follow the same rule: validation decodes for compatibility, while
the portable history and IndexedDB replica retain the original supported Event
representation.

- All entities cached locally in IndexedDB
- Supports offline operation in field
- `created` and `updated` timestamps enable conflict resolution

### Capacity & Scaling Estimates

IndexedDB is a real embedded database and handles large datasets well. Estimated data volumes for a single banding station:

| Timeframe | Records | JSON bundle size |
|-----------|---------|-----------------|
| Year 1 | ~3,000 | ~3–6 MB |
| Year 5 | ~15,000 | ~15–30 MB |
| Year 10 | ~30,000 | ~30–60 MB |

Assumptions: ~50 birds/session, 2 sessions/week, 30 weeks/year, ~1–2 KB per record as JSON.

**IndexedDB limits:** Comfortable up to ~100K+ rows. Browser storage quotas are generous (typically 50%+ of disk on modern browsers/PWAs).

**JSON bundle limits:** Export/import starts feeling slow around ~50K+ records due to serialization. Splitting by year or session range could extend this.

**When to move to Postgres:**
- Multiple users or stations need shared/synced data
- Server-side queries, reports, or dashboards are needed
- Data volume exceeds ~100K records (unlikely for years at one station)

For a single user or small team at one station, IndexedDB + JSON data bundles is a viable long-term strategy.

### Approved Collaboration Architecture (Phase 26)

The target architecture is defined in
[ADR 0016](../../adr/0016-event-sourced-collaboration-architecture.md).
It replaces mutable authoritative entities with a local-first event model:

- Typed immutable Domain Events are durable truth; clients rebuild local
  query/UI projections by replaying them.
- Event contracts are YAML-authored, restricted JSON Schema 2020-12 in
  top-level `schemas/`; JSON is the first transport. Event types version
  independently.
- Events and workspace-owned entities use locally generated UUIDv7 IDs.
- Concurrent field amendments use deterministic field-level last-write-wins
  with envelope v2 HLC `{ physical_ms, logical }` and an event-ID tie-breaker.
  Both values are non-negative safe integers. The pure Event module owns
  `tick`, `observe`, and comparison: `tick` advances physical time when the
  wall clock advances, otherwise increments logical time; `observe` uses the
  maximum local, remote, and wall-clock physical time and increments the
  applicable winning logical value. Field persists its high-water mark and
  reports counter overflow rather than wrapping it. Immutable v1 Events from
  the historical Workspace/access catalog decode through a deterministic v2
  upcast using the validated, finite non-negative
  Unix milliseconds of `occurred_at` and logical zero. The shared parser, not
  platform `Date`, retains/pads only the first three fractional-second digits,
  applies the numeric offset, and normalizes a permitted `:60` leap second as
  `:59` plus one second (for example, `2016-12-31T23:59:60.250Z` becomes
  `2017-01-01T00:00:00.250Z`). New pilot Events are v2. Physical-band
  conflicts are surfaced, not silently overwritten.
- Phase 30 adds the smallest operational Event slice capable of the
  collaboration pilot: Session creation plus Banding Record creation and field
  amendment. Its physical-band assignment is deliberately retained as two
  visible facts when concurrent Events collide, rather than silently choosing
  one allocation.
- Commands enforce structural and authorization rules; scientific validation
  remains soft warnings recorded with the event/projection.
- Supabase Auth provides Google OAuth. Workspace Membership, rather than an
  external identity-provider claim, controls authorization.
- A deploy-only trusted operator bootstraps the first Workspace and pending
  Workspace Memberships through canonical Events. It does not create Supabase
  Auth users. A later Google session calls a server-side initial-access claim
  that derives its principal, exact-email-matches the pending Membership, and
  atomically links/activates the User Account before ordinary exchange. The
  migration deployer and Provisioner runtime login are separate; the latter
  can execute only one non-exposed bootstrap function and has no raw Event Log
  or Membership DML. Its credential stays in the trusted deployment
  environment, never in a Field device or browser bundle.
- Supabase is initially an event-admission and exchange provider. It verifies
  the server-derived actor, active Membership, event identity/content, and
  envelope before append; it does not own business projections. Browser code
  receives only the initial-access claim, append-receipt, and server-sequenced
  pull interfaces—never DML grants on Event Log or Membership tables.
  `@birdnerd/sync-state` keeps this provider behind an adapter seam for future
  P2P. A retryable admission dependency has a distinct `deferred` status with
  reason, count, and retry time, never `Synced`; the count is derived from the
  active Workspace's full durable deferred queue, not only the bounded batch
  currently being exchanged. An explicit **Sync now** passes force intent to
  the durable-replica read seam: it includes every deferred Event for the
  active Workspace ahead of bounded ordinary work, while automatic retries
  remain bounded. If that forced exchange fails, the visible deferred reason
  and count are retained. A fresh deferred receipt replaces that Event's retry
  deadline; only distinct untouched deferred Events retain an earlier one.
- Shared Supabase tables, functions, explicit grants, and RLS policies are
  versioned together as reviewed Supabase CLI SQL migrations in the repository.
  The Event Log has unique `event_id` and indexed `(workspace_id,
  server_sequence)` pulls; the derived Membership index supports authorization
  lookups. `SECURITY DEFINER` functions use a fixed safe search path, revoke
  `PUBLIC` execution, and grant only their intended role. Terraform is not the
  schema-management mechanism for this phase.
- Event Bundles replace the former mutable JSON bundle. Restore validates its
  format, Event compatibility, and single manifest Workspace before any
  IndexedDB write, but does not rewrite valid historical Event JSON. It
  requires an active Membership for that Workspace, then protects unsynced
  Events, replaces/rebuilds the replica, and synchronizes. History
  merge/adoption is deferred.

### Field Authentication Module (Field 0.32.2)

Field UI depends on the provider-neutral `AuthModule` interface, which exposes
current authentication state, state subscription, labelled sign-in actions,
action-ID sign-in initiation, and sign-out. Its `ExternalIdentity` represents
an external authenticated identity only; it is not a BirdNerd User Account and
grants no Workspace authorization.

The shared `SupabaseSessionAuth` Module owns Supabase session restoration,
state changes, identity mapping, recoverable errors, and sign-out. Its
sign-in seam has two concrete production/development roles: the Google
interaction Adapter owns scopes, redirect construction, and callback-fragment
cleanup; the local fixture-session Adapter owns selection of one of the two
launcher-provided disposable email/password profiles. The local adapter is
available only to a Vite development build marked as the verified loopback
`local` target. It maps the local session through the fixture's synthetic
Google identity, so the existing initial-access claim and Workspace access
continue to use their established identity form. Hosted-pilot and production
builds select the Google Adapter even if local fixture values are ambient. The
unavailable-configuration adapter and in-memory test fake implement the same
interface. Identity linkage and Workspace Membership remain separate Modules
so the identity provider cannot become the authorization source.

The approved rollout is Phases 27–30 in [docs/plan.md](../../plan.md). The
first pilot covers two Stations and two to four members, including parallel
work at one Station and offline convergence.

### Local Event Core (Field 0.29.0)

Phase 29 makes the Workspace-access vertical slice durable without advancing
Supabase exchange or field-data commands ahead of the roadmap:

- `schemas/workspace/` is the portable YAML/JSON-Schema source of truth for
  `workspace.created`, `membership.preauthorized`, `user-account.linked`, and
  `membership.activated`. `npm run generate:event-bindings` writes committed
  TypeScript bindings/structural validation for `@birdnerd/events`, while
  `npm run check:event-bindings` detects drift in local and pull-request CI.
  The package owns UUIDv7 creation, JSON codec validation, HLC clock behavior,
  and the v1-to-v2 upcast boundary; it does not own reducers or storage.
- `@birdnerd/banding` owns pure Workspace admission and activation decisions
  plus deterministic Workspace-access projection. Supabase owns the
  authoritative initial-access transaction; its projection snapshot is a
  cache-only representation of the Event Log, never an authoritative model.
  `@birdnerd/sync-state` owns generic immutable append/idempotency behavior;
  it does not import Field, IndexedDB, or domain reducers.
- Field owns `WorkspaceEventStore`, an IndexedDB database named
  `birdnerd-event-core` with an append-only `event_log` and derived
  `projection_cache`. Accepted events and their rebuilt cache commit together;
  hydration loads Events and regenerates the cache. It is intentionally a new
  store, so the legacy `birdnerd` mutable database is neither migrated nor
  altered. A failed event-store write resets the in-memory log before retry.
- The separate `@birdnerd/provisioner` TypeScript CLI remains the local
  hand-off until Phase 30. The Phase 30 deploy-only operator instead calls the
  least-privilege bootstrap function; it emits canonical Events through the
  same admission invariant and returns an audit receipt. Neither is an Event
  Bundle or Field-device provisioning mechanism.
- `WorkspaceAccessGate` continues to require BirdNerd-owned access after
  provider-neutral sign-in. Phase 30 replaces client-local pending-Membership
  activation with the server-side initial-access claim; Field stores the
  returned accepted Events and permits no ordinary pull or push until the
  active result is durable. The current PWA starts with an empty Event Log
  unless a local harness supplied accepted bootstrap Events.

All new Field and bootstrap IDs use UUIDv7, and the test/initial-hydration
bundles were recreated with UUIDv7 identifiers and internally valid references.
The former mutable `DataBundle` remains only as legacy app migration/test code;
collaboration recovery uses Workspace Event Bundles and never converts or
imports that mutable format into the Event Log.

### Supabase Event Exchange and Pilot Replica (Field 0.30)

- Event envelope v2 adds `event_envelope_version: 2` and HLC
  `{ physical_ms, logical }`. `@birdnerd/events` owns tick, observe, ordering,
  RFC 3339 millisecond conversion, and v1 upcast. New local writes persist the
  HLC high-water before Event construction, so restarts and clock regression
  cannot move the replica backward.
- `@birdnerd/banding` owns `session.created`, `banding-record.created`, and
  `banding-record.fields-amended` commands plus the deterministic projection.
  Each field selects its winning Event by HLC then `event_id`; current physical
  band allocations are grouped into visible conflicts without deleting either
  fact.
- `@birdnerd/sync-state` exposes one coordinator Interface: synchronize and
  observe status. Its internal Event-exchange Seam handles initial access,
  push receipts, and server-sequenced pull pages. Push receipts are accepted,
  duplicate, retryable `deferred` (with admission reason), or permanent
  rejection. Field's durable replica Adapter atomically persists received
  Events, receipts, projection state, HLC high-water, and cursor. Deferred
  Events remain effective and pending; permanent rejections remain diagnostic
  evidence and are excluded from the effective projection.
- Supabase's Adapter calls only `birdnerd_claim_initial_access`,
  `birdnerd_append_events`, and `birdnerd_pull_events`. A versioned SQL
  migration keeps the Event Log and Membership admission index in the
  non-exposed `birdnerd_private` schema, enables RLS defense in depth, denies
  browser table DML, and grants authenticated execution only on those RPCs.
  `npm run check:event-bindings` also compares the SQL Event Type branches and
  exact-key checks with the YAML Contracts and verifies a full Contract
  fingerprint, so CI fails if the provider validator drifts.
- The exchange and recovery seams validate supported historical Events before
  accepting them, then preserve their raw JSON through server receive,
  IndexedDB, outbound queue/retry transport, Event Bundle export, and Bundle
  restore. The one interpretation boundary is `WorkspaceEventStore`:
  canonical upcasting occurs only for replay, projection, admission comparison,
  and new command decisions.
- The deploy-only Provisioner connects with a database login inheriting only
  `birdnerd_provisioner`. Its one private bootstrap function appends canonical
  Workspace/pending-Membership Events and returns an audit receipt.
- IndexedDB schema version 3 separates `event_log`, `projection_cache`,
  `outbound_queue`, `sync_metadata`, and `receipts`. Its v3 upgrade marks a
  legacy v2 pending queue Event as deferred only when its durable latest receipt
  is the retryable `deferred` union member; all other legacy rows are durably
  marked non-deferred, so offline retry metadata is never inferred as an
  admission dependency. The provider-neutral Event
  Pipeline diagnostics view reads those stores only in development builds;
  rejected Events remain grouped by `command_id` with their queue and receipt
  evidence even though they are omitted from the effective projection.
- Workspace Event Bundle v1 contains a manifest, integrity digest, and current
  or historically compatible Workspace/access Events in their original raw
  representation. Pilot Session and Banding Record Events require envelope v2.
  Restore validates every Event and Workspace before writing, preserves pending
  local Events, resets the pull cursor, rebuilds canonically, and catches up
  through normal authenticated sync.

### Phase 31 operational Event architecture

- `@birdnerd/banding` exposes a discriminated command/decision Interface and a
  deterministic operational projection Interface. It owns authority checks,
  lifecycle semantics, field-level HLC reduction, and Band conflict
  derivation; UI, storage, and transport remain adapters.
- The Event Catalog covers Station, Net, Person, Bander, User Account-to-Person
  link, Band, Session, Session crew, and complete non-photo Banding Record
  behavior. Existing Phase 30 Event v1 shapes stay immutable; complete Session
  and Record contracts use v2 plus deterministic upcasters. Contract tooling
  dispatches by Event type and per-type schema version.
- Amendment omission means unchanged and JSON `null` means explicitly clear.
  Lifecycle is independent: an amendment never reactivates an entity.
- Band selection is one managed/foreign/unbanded value. Managed selection
  carries Band ID and a number snapshot; a missing local parent remains an
  unresolved reference. Deployment is derived from active Record facts, and
  projections surface both incompatible new-deployment claims and duplicate
  normalized band-number claims.
- `band.received` retains a structural Band ID/number plus optional `band_size`
  and `band_type`; one typed batch command emits one independently retryable
  Event per Band under one command ID. `band.fields-amended` uses field-level
  HLC/LWW and `null` explicit clears for those intrinsic facts. The rebuildable
  Band-inventory projection exposes status, current species, deployment and
  last-seen dates, and ordered encounters. Status is never persisted: active
  Record capture/replacement facts derive it, while Band lifecycle Events alone
  derive inactivity, so correcting or deactivating a source fact recomputes it.
- Supabase append admission applies a static Event-type minimum-role table and
  a minimum entity-ID/kind/Workspace reference index. Known wrong-kind or
  cross-Workspace references are permanent rejections; an unknown dependency
  is retryable so out-of-order delivery can converge. This index is not a
  server business projection.
- The provider-neutral receipt union adds `deferred` for that retryable
  dependency. Sync-State keeps the local Event effective and pending, persists
  its reason/attempt, reports a visible deferred/waiting state throughout a
  persisted retry deadline, and schedules bounded backoff; only permanent
  rejection removes it from the effective projection.
- Field contains no Membership-management UI. The trusted Provisioner CLI adds
  invite, role-change, deactivate, and reactivate commands backed by narrow
  private functions. Each constructs Membership Events and updates the
  admission index atomically, returns an audit receipt, and protects the last
  active Admin invariant.
- The active-Net picker remains available by Station. There is no Phase 31
  `SessionNetLog` Event family or automatic per-session Net initialization.
- Home reaches Event Bundle recovery through a focused Event-replica adapter;
  it never mounts the retained legacy mutable Data Manager. Restore validation,
  unsynced-Event protection, rebuild, and authenticated catch-up stay behind
  the existing collaboration boundary.
- Operational UI reads only the rebuildable projection: Session summaries
  derive protocol, MAPS period, and active Record counts; Record inspection is
  a disabled view with no command path; and Capture Time choices come from the
  selected Session through the pure `netCheckTimes` helper while retaining a
  projected off-cadence value.

See [ADR 0018](../../adr/0018-operational-event-catalog.md) for the
catalog and admission decisions.

### Data Validation Datasets (future)

Tables provided by domain experts for validation:
- Species × Band size mapping
- Species × Wing range
- Species × Tail range
- Species × Tarsus range
- Species × Culmen range
- Species × Mass range

---

## 5. API & Integration

### Phase 30 Supabase RPC Interface

- `birdnerd_claim_initial_access()` derives the authenticated Google principal,
  exact-email-claims a pending Membership atomically, and returns canonical
  access Events in server sequence.
- `birdnerd_append_events(events)` validates active Membership, target
  Workspace, actor, envelope, schema, and immutable identity/content; it
  returns accepted, duplicate, retryable-deferred, or permanent-rejection
  receipts. A deferred receipt means a referenced parent has not reached the
  private admission index yet; Field retains the immutable Event and retries.
- `birdnerd_pull_events(workspace_id, after_server_sequence, page_size)` checks
  active Membership and returns at most 100 Events in server sequence.

Raw Event Log, Membership index, and receipt tables are not Data API surfaces.
The publishable key is the only Supabase key embedded in Field.

Phase 31 keeps those browser RPCs and extends append validation with the
reviewed Event-type role table and entity-reference index. Membership
administration is separate: the trusted Provisioner runtime may execute only
narrow private invite/role/deactivate/reactivate functions and receives audit
receipts, never table DML. The follow-up versioned migration rebuilds that
private admission index idempotently from all applicable immutable historical
creation/receipt Events; it changes derived state only and never rewrites the
Event Log. After merge approval, a trusted schema deployer follows the
[collaboration pilot runbook](collaboration-pilot-runbook.md#2-apply-and-verify-the-schema)
for linked-project application and verification; Field and local tests never
apply this migration to the hosted Workspace.

### OpenAPI / GraphQL (Future)

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

- Per-session CSV export available in Session View (export banding records for a single session)
- Standalone CSV import/export buttons were removed from Data Manager in Phase 15a (replaced by agency-specific export formats)

### Event Bundle (Field 0.30; replaces Phase 9 JSON Data Bundle for collaboration recovery)

The legacy `DataBundle`/`BUNDLE_VERSION` implementation remains internal to
legacy mutable-data tests and utilities. Data Manager's collaboration recovery
surface uses the Workspace Event Bundle.

An Event Bundle is a JSON container with a small outer format version, a
Workspace manifest, and Domain Events carrying their own type and schema
version. It is not a global domain-schema version. Code tables and species
remain static app resources; photo blobs remain outside the Event Bundle until
their transfer design is explicitly added.

**Backup and restore:**

- Export contains a Workspace Event Log. A projection snapshot may accompany
  it as a non-authoritative startup cache. Export preserves each compatible
  Event's raw immutable JSON; replay/upcasting is not an export transform.
- V1 restore is recovery-only: replace/rebuild the local replica, protect any
  unsynced local events, authenticate, then catch up through normal sync.
- Event-ID deduplication makes restoring an older bundle before sync safe.
- Explicit merge/adoption of two histories is not part of v1.

**Seed and hydration:** Phase 29 recreates the legacy app's test and
initial-hydration fixtures with UUIDv7 identifiers and valid internal
references, but leaves their mutable `DataBundle` rows in place until
field-data Event Contracts and commands exist. The restricted Provisioner
creates the first Workspace and Admin through the event/admission/projection
path.

### Future: BBL & Legacy Data

- Import full band lists from BBL exports
- Reconcile with app's internal band numbers
- Handle location code mapping (app local code vs BBL code)

---

## 7. Deployment & DevOps

### Current

- GitHub Pages static hosting
- Client-side rendering only (no Node.js backend required)
- **PWA update mechanism:** `registerType: 'prompt'` — new service worker waits for user action. `useRegisterSW()` hook detects updates; `UpdateBanner` component offers "Update now" (triggers `SKIP_WAITING` + reload) or "Later" (dismisses until next app open). App version from `package.json` injected at build time via Vite `define` and displayed on About page.
- **Multi-app PWA constraint:** the field app is served from `/birdnerd/` and the OCR app from `/birdnerd/ocr/` under the same GitHub Pages site. The field app service worker scope overlaps the OCR subtree, so the field app's Workbox navigation fallback must denylist `/birdnerd/ocr/` to avoid serving the field app shell for OCR routes.

### Collaboration backend

- Supabase project (includes Postgres, Auth, Storage)
- Environment variables for API endpoints, auth keys
- Database migrations via Supabase CLI or custom scripts
- Optional: CI/CD pipeline (GitHub Actions) for testing and deployment

### Local Field development and fixture Module (Field 0.32.0–0.32.2)

The repository-level local-environment Module is implemented by
`scripts/field-dev.mjs`. Its small Interface is `npm run dev` (or
`npm run dev:host`) for local Field development and the separately named
`npm run dev:pilot` (or `npm run dev:pilot:host`) for an intentional hosted
pilot session. Package scripts supply exactly one fixed target marker, so an
appended argument cannot turn `npm run dev` into a hosted session. It keeps
Docker/CLI lifecycle, target selection, and temporary browser configuration
out of Field callers.

For the default Interface, the Module invokes only the pinned project-local
Supabase CLI's `status` and, when necessary, `start` commands from this
checkout. It reads `status --output env`, requires the returned API URL to be
an HTTP loopback URL, and supplies that URL plus the current publishable key
(or CLI compatibility `ANON_KEY`) as process environment with precedence over
Vite files. A non-loopback, missing, or malformed status value is a safe error;
the default command never links, resets, or writes to a hosted project.

Hosted pilot selection is deliberately not an argument to `npm run dev`.
`npm run dev:pilot` reads only the uncommitted
`apps/field/.env.pilot.local` file, requires a non-loopback HTTPS URL, and
never starts or manages a CLI stack. The release/build path still receives its
publishable values from GitHub Actions, as documented in the deployment notes.
`npm run fixtures:load -- operational-workspace` is the only Interface for
the first versioned, disposable local fixture. Its Fixture Loader Module in
`scripts/fixture-loader.mjs` accepts only that fixed name, validates
`data/fixtures/operational-workspace.yaml`, and owns all of the privileged
workflow: CLI configuration reload, loopback-only reset without an ambient SQL
seed, synthetic local Auth setup, restricted Provisioner bootstrap,
authenticated claim/append receipts, and server-ordered replay verification.
Callers cannot supply a database URL, user credential, SQL fragment, or fixture
path.

Before it resets or writes data, the Module requires the project-local CLI's
`status --output env` API and PostgreSQL URLs to be loopback, and rejects a
PostgreSQL URI query or fragment that could override that verified endpoint.
It refuses a malformed or non-local result. It uses `db reset
--local --no-seed`, then rechecks the same endpoint before it touches Auth or
the Event Log. A committed local-only Auth configuration permits the synthetic
email/password sessions used by the Loader; restarting the CLI-local stack
applies that configuration, while self-service signup remains disabled. The
secret/legacy service key is read only inside
the trusted Node process to create local synthetic users and is never passed
to Vite, Field, or a browser.

The loader creates its synthetic Auth users through the local Auth Admin
interface and adds a local synthetic Google identity only because the existing
initial-access claim deliberately accepts Google identities. It uses the
restricted Provisioner role—not Event or Membership DML—to create one
Workspace with pending Admin and Contributor Memberships. Both Members then
obtain ordinary local sessions, independently call the existing claim RPC, and
append through the existing authenticated admission RPC: the Admin creates a
Station, Net, Person, Bander, and Band; the Contributor creates a Session and
Banding Record. A pull by each Member must produce exactly the same declared
14-Event history and a replayable seven-entity operational projection. The
only direct database writes are disposable local Auth/bootstrap-role mechanics;
all BirdNerd facts follow their normal Provisioner or admission paths.

For the local target only, the same launcher reads the one declared fixture
and injects the two fixed sign-in profiles with precedence over ambient Vite
values. It injects only the known disposable passwords, email addresses, and
labels; browser code never receives the local secret key, database URL, or an
arbitrary account selector. The signed-out Field screen then offers **Continue
as Fixture Admin** and **Continue as Fixture Contributor**, which create real
local email/password sessions. The fixture's synthetic Google identity remains
the identity used by the existing claim and Workspace-access path. The hosted
pilot target explicitly clears local-profile values and stays Google-only.
Separate browser profiles can therefore exercise the Admin and Contributor
concurrently against real local RLS, Event admission, exchange, and sync.

This slice does not add local Google OAuth, load/reset a hosted project,
define generic SQL seeds, permit self-service signup, or add a hosted profile
selector.

### Error Handling

- **ErrorBoundary** class component wraps the entire app in App.tsx
- Catches runtime React errors, shows friendly fallback UI with error message and "Return to Home" button
- Logs error + component stack to console via `componentDidCatch`
- Future: Sentry or similar for remote error tracking
- Future: Analytics for usage patterns

---

## 8. Security & Privacy

### Current collaboration pilot

- Google OAuth through Supabase Auth; no email/password, magic-link, anonymous,
  or self-service Workspace join flow
- Workspace Membership authorization enforced independently by server RPCs
- RLS and explicit grants on all Supabase data; no browser table DML
- Publishable browser key only; Provisioner/deployer credentials remain in
  separate trusted environments
- HTTPS only
- Data encryption in transit
- PII considerations (Person, User records)

### Disposable local fixture exception

The committed Supabase CLI configuration enables email/password only for its
Docker-local Auth service so the trusted Fixture Loader and the two fixed local
fixture actions can obtain real sessions for synthetic Members. It neither
changes hosted Supabase Auth nor adds a generic Field email/password screen.
The local launcher exposes only the two known disposable fixture passwords;
the local secret key remains confined to the trusted Loader process and Field
never receives a database URL.

### Compliance

- Data retention policies (TBD)
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

## 10. Reusable Components

| Component | Purpose | Used by |
|-----------|---------|---------|
| **PageHeader** | Title bar with home + optional back button | All 9 page-level screens |
| **SearchableSelect** | Dropdown with search for code-table fields | BirdRecordForm, SessionList, SessionView |
| **BandSearchSelect** | Band number search with status chips, unbanded/foreign options | BirdRecordForm |
| **SpeciesAutocomplete** | Type-ahead for 1,323 BBL species (common name ↔ alpha code) | BirdRecordForm |
| **Collapsible** | Expandable section with toggle header | BirdRecordForm (molt/morphometrics), SessionView (weather) |
| **PhotoSection** | Camera capture + photo list for a banding record | BirdRecordForm |
| **PhotoReviewModal** | Photo preview, body-part label picker, share/download | PhotoSection (internal) |
| **UpdateBanner** | "New version available" prompt with dismiss/update | App (global, fixed bottom) |
| **ErrorBoundary** | Catches runtime errors, shows fallback UI with reset | App (wraps entire app) |

**Shared styles:** `apps/field/src/styles/theme.ts` exports design tokens (`colors`) and common style objects (`inputStyle`, `labelStyle`, `cardStyle`, `cardElevatedStyle`, `btnStyle`, `rowStyle`, `nowBtnStyle`, `dropdownStyle`). See § 11 for details.

---

## 11. Known Limitations & Technical Debt

- **Status quo:** No computed fields in IndexedDB; client-side aggregation for effort totals
- **Future refactor:** Consider splitting Session schema into separate multi-tenant workspace
- **Band number format:** Resolved — stored formatted with hyphen (XXXX-XXXXX or XXXX-XXXXXX)
- **Auxiliary band markers:** Not yet designed; needed for complex band scenarios

### Inline Styles & Design Tokens

**Current state:** `apps/field/src/styles/theme.ts` centralizes design tokens (`colors`) and common style objects (`inputStyle`, `labelStyle`, `cardStyle`, `cardElevatedStyle`, `btnStyle`, `rowStyle`, `nowBtnStyle`, `dropdownStyle`). Imported by 13+ files.

**Card variants:**
- `cardStyle` — gray background + border. Use for editable forms and inline detail views (session edit, location/person forms, list row cards).
- `cardElevatedStyle` — white background + drop shadow. Use for standalone display surfaces and dashboard content (band inventory, about page, error boundary).

**Remaining backlog:**
1. **Consolidate dropdown components** — BandSearchSelect, SearchableSelect, and SpeciesAutocomplete share dropdown/option/input styles and open/close/click-outside logic. Extract a shared `Dropdown` primitive.
