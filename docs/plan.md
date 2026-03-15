# BirdNerd PWA — Plan

## Overview
A Progressive Web App for bird banders collecting data in the field, primarily at stations following protocols like MAPS/IBP. Targets iPhone/iPad first, Android support desired. Works online and offline gracefully.

## Core Data Record (per bird)
Fields per banding event, based on MAPS/IBP protocol sheet (Location: GCFS, 2026):

| Field | Notes |
|---|---|
| Band Number | |
| Species Name | 4-letter alpha code or full name |
| Age | Numeric code |
| Sex | M/F/U |
| How Aged | |
| How Sexed | |
| BBP Code | Capture type/status |
| Skull | 0–6 scale |
| CP | Cloacal Protuberance |
| BP | Brood Patch |
| Fat | 0–5 scale |
| Body Molt | Code |
| FF Molt | Flight Feather molt code |
| TF Molt | Tail Feather molt code |
| FF Wear | |
| Molt Limits & Plumage | |
| Wing | Chord measurement (mm) |
| Body Mass | Weight (g) |
| Status | |
| Capture Time | |
| Date (MO/DAY) | |
| Station | e.g. GCFS |
| Net | Net number/ID |

Validation datasets will flag inconsistencies (season, sex, molt, age, etc.) and give gentle warnings.

## Data Organization
- **Session** = Station + Date (top-level grouping)
- **Station:** Multiple supported (currently 2; designed for other stations to adopt the app)
- **Banders:** Session-level roster selected at session open (master bander + day's banders); roster drives the per-record bander dropdown; master bander always included
- Records belong to a session; bander captured per bird from the session roster (or manual entry)

## UX / App Feel
- Installable as home screen icon on iPhone/iPad/Android — looks and feels like a native app
- Users should not need to know it's a web app (full PWA manifest, splash screen, standalone mode)

## Protocol
- MAPS/IBP standard
- Reference code tables: age codes, skull scores, fat scale, molt codes — to be sourced/confirmed

## Species Entry
- Autocomplete from master species list (BBL 4-letter alpha codes)
- UI shows: alpha code + common name together for verification
- Data stored: alpha code only
- **Phase 1:** Placeholder list of common CA species only (species-level codes, no subspecies)
- **Future:** Expand list; add subspecies support (e.g. GCSP Gambel's vs. Puget Sound White-crowned Sparrow) — some subspecies have distinct codes, others may need a subspecies field

## Technology
- **Frontend:** React + TypeScript + Vite
- **PWA:** vite-plugin-pwa (offline support, installable)
- **Forms/Validation:** React Hook Form
- **Hosting:** GitHub Pages (static, free)
- **Backend/Sync:** Offline-first to start; Supabase to be added later
- **Storage:** Local (IndexedDB or localStorage) for offline data

## Validation
- **Soft warnings/flags only** — no hard blocks
- All fields optional (birds can escape mid-record; partial data is still valuable)
- Warnings based on: season, species, sex, molt, age, fat, measurements
- Validation datasets to be defined in a later phase (species by season, weight/wing ranges, molt timing, sex-linked fields like CP/BP)

## Form UX
- Single scrollable form per bird — all fields accessible at once (no wizard; banders skip around freely)
- Grouped into logical sections (identity, measurements, molt/condition, metadata)
- Fields can be filled in any order; partial records saveable (banders wait on scale, pliers, ruler, master bander input)
- Typical session: 2–4 banders + 6–9 extractors; 2–3 days/week (mostly weekends)

## Users & Auth
- **Phase 1:** No login — bander name selected/entered as a field per record
- **Future:** Login/auth (email or Google) when central sync is added
- Designed for small teams (master bander + 1-2 trainees) per station, eventually multi-station

## Data Export & Sync (planned)
- CSV/spreadsheet export (match existing workflow)
- Central database sync (multi-user, e.g. Hallie can review)
- BBL/reporting system submission
- Phase 1: local only; export and sync added in later phases

## Phases

### Phase 1 — Done ✓
- Offline-only, no login
- Species autocomplete (placeholder CA list)
- Sessions + records stored in IndexedDB
- PWA installable on iPhone/iPad
- Two stations: GCFS (Galindo Creek) + MCFS (Mitchell Canyon)

### Phase 2 — Deploy & Polish

**Deployment & Access**
- Deploy to GitHub Pages so Hallie and team can access publicly
- Add a route / flow that guides users through "Save to Home Screen" (automate/explain the iOS add-to-homescreen UX)

**Home Screen & Branding (placeholder)**
- Add a simple home screen / landing page within the app
- Placeholder icon/branding (real graphics come later)

**Import / Export**
- Download records as CSV (match existing banding sheet workflow)
- Upload / import CSV (ingest data from existing sheets)

### Backlog (unordered — to be prioritized into phases)

**Data & Fields**
- Add WRP (Wolfe-Ryder-Pyle) field to bird record
- MVP validation from dataset (soft warnings: season/sex/molt/age inconsistencies)
- **Bander workflow on session open:** select master bander (currently only Hallie) + variable number of additional banders for that day — this roster populates the per-record bander dropdown; master bander is always included in the dropdown since she regularly steps in to band herself
- Bander field on record: dropdown from session roster + allow manual entry (combobox style)

**Media**
- Ability to capture photo and attach to a record
- Speech-to-text (STT) input for field entry

**Branding**
- Get graphics — convert bird drawings or photos into clean vector assets for icons, splash, UI

**Auth & Multi-tenancy**
- Login / authentication (email or Google via Supabase Auth)
- Supabase integration for central cloud storage + sync
- Multi-tenant data model: data scoped to an **Organization** (e.g. a field station group)
- Organizations as a top-level principle: each org manages their own stations, banders, and records
- Allow other organizations to adopt the app and keep their data fully separate

**Utility / Toolkit Direction**
- Consider expanding BirdNerd from data-capture-only into a field toolkit:
  - Standalone band code lookup tool
  - Scientific name / definition lookup (fold in existing app)
  - Possibly a second lighter "in-the-field" utility mode alongside the banding data capture
