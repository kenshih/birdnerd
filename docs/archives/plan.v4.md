# BirdNerd — Plan v4 Archive

Completed phases 15–18. See [plan.v3](plan.v3.md) for phases 1–14.

---

## Phase 15 — Agency Export

Goal: Export in agency-specific formats. Built in-app (not separate tooling).

### 15a — IBP (MAPS Master List) ✅
- 49-column CSV matching Hallie's MASTER sheet layout
- IBP ↔ BBL dual columns for: Code, How Aged, How Sexed, Body Molt, FF Molt
- Code translation mappings: BBL 2-letter → IBP single-letter (How Aged, How Sexed), numeric → alpha (Age), Capture Code (1→N, 4→D, 8→L)
- Band number stripped of hyphen, capture time to numeric, booleans to Y/N
- Bander resolved via FK chain (bander → person → initials), location via session FK
- Agency Export section on Data Manager page with format picker + multi-select session scope
- Removed old CSV export/import buttons from Data Manager (kept per-session CSV in SessionView)
- `generateIBPRows()` exposed for testability
- Tests: 6 new (80 total)

### 15b — BBL Upload Format ✅
- BBL upload format (58 columns) for new bandings — filters to bbpCode `1` only
- BBL recapture upload format (60 columns) for recaptures — filters to bbpCode `R`, `F`, `4`, `5`, `6`, `8`
- `how_obtained` and `how_captured` hardcoded to "Mist net" for now (see backlog)
- `banded_leg` hardcoded to "R"
- Band numbers (including replaced/second) stripped of hyphens
- Body Molt / FF Molt converted to BBL Y/N
- Capture time exported both as numeric (for paste) and HH:MM
- Format picker on Data Manager page updated with all three options
- `generateBBLRows()` / `generateBBLRecapRows()` exposed for testability
- Agency export format transformations documented in tech spec § 3
- Tests: 5 new (85 total)

### 15c — CDFW Format (backlogged)
- TBD — requirements not yet documented, waiting on Hallie

---

## Phase 15.5 — Bug Fixes & Refactors ✅

- Fix: photo reference saved even when share fails (non-AbortError path)
- Fix: blood sample validation warns when status is missing, not only when wrong
- Fix: data bundle import confirmation now counts sessionNetLogs, bands, and photos
- Fix: editing session location refreshes nets for new location
- Fix: band status conflict validation includes capture code "N"
- Fix: agency export includes bbpCode "N" in BBL new bandings + IBP mapping
- Fix: deployed bands now selectable in BandSearchSelect for recaptures
- Fix: deleting a record reverts band to available (if no other records reference it)
- Fix: false "already deployed" warning suppressed when re-editing own band
- Refactor: `isNewBanding()` / `isRecapture()` helpers in codes.ts (DRY capture code checks)
- Refactor: `src/styles/theme.ts` — shared design tokens + common styles, updated 13 files

---

## Phase 16 — PWA & Deployment ✅

- Changed `registerType` from `autoUpdate` to `prompt` — new service worker waits for user action
- `useRegisterSW()` wired into App.tsx with `onNeedRefresh` callback
- UpdateBanner component: fixed bottom bar, "Update now" + "Later" (dismissable, reappears on next open)
- App version from package.json displayed on About page via Vite `define`
- App.tsx refactored from early returns to if/else so banner renders on every page

---

## Phase 17 — Error Boundary ✅

- `ErrorBoundary` class component wrapping app in App.tsx
- Fallback UI: error message, "Your data is safe" reassurance, "Return to Home" button (resets error state)
- Error details logged to console via `componentDidCatch`

---

## Phase 18 — UI Components & Styles ✅

### 18a — Card Variants ✅
- Document card variant convention: `cardStyle` (gray+border) = editable forms/detail views, `cardElevatedStyle` (white+shadow) = read-only/dashboard content
- Updated tech spec § 11 with the documented convention; removed resolved backlog item
- `<Card>` and `<CardElevated>` components wrapping the style objects; standardized default `marginTop`; updated all usages

### 18b / 18c — deferred to backlog
- Vitest Browser Mode and Dropdown Consolidation deferred; see backlog in plan.md
