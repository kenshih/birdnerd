# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adapted for BirdNerd's multi-app monorepo.

## [Unreleased]

### Changed

- Field: Move `birdnerd-full-sample.json` into `apps/field/examples/`.
- Repo: Refresh conservative workspace dependencies before OCR engine work, including React, React DOM, React Hook Form, `@typescript-eslint/*`, and Vite `7.3.2` for current security fixes.
- Repo: Refresh transitive dependencies in `package-lock.json` via `npm audit fix` (lockfile-only, no `package.json` changes) before resuming sync spike work.

### Added

- Sync 0.1.0: Scaffold `apps/sync-spike` workspace with Yjs + y-webrtc. Two browser tabs (or devices) join a shared room code and sync a textarea via WebRTC using public signaling.
- Repo: Add `dev:sync`, `dev:sync:host`, and `build:sync` root scripts for the sync spike workspace.
- Repo: Add a repo-level changelog to track shipped changes separately from the forward-looking plan.

### Fixed

- Field: Sync `SpeciesAutocomplete` input to external value changes so opening an existing banding record shows the saved species code instead of an empty field.

### Removed

- Repo: Drop the unused root `package.json` `version` field. Each workspace owns its own version; the changelog tracks repo-level history.

## [2026-04-12]

### Added

- OCR 0.4.1: Add the first row-template-driven field segmentation for the supported left-side bandsheet layout.
- OCR 0.4.1: Add visible field-window overlays for `bandNumber` and `speciesCode` so OCR geometry can be tuned against the selected row preview.
- OCR 0.4.1: Add focused OCR result cards for species code and band number instead of overwriting a single generic OCR result area.

### Changed

- OCR 0.4.1: Replace rough percentage-only field guesses with a first machine-friendly row template plus template-derived field windows.
- OCR 0.4.1: Improve OCR preview performance by rendering a true cropped row preview bitmap instead of scaling the full source image into the preview.
- OCR 0.4.1: Tune the current `bandNumber` and `speciesCode` windows against real sheet examples and confirm that grouped species-code OCR is more promising than grouped band-number OCR.

## [2026-04-12]

### Added

- OCR 0.4.0: Add the first browser OCR spike using `tesseract.js` in the OCR workspace.
- OCR 0.4.0: Add a row-level OCR panel with raw OCR output inspection and targeted OCR test actions for species code and band number.

### Changed

- OCR 0.4.0: Keep the first OCR integration deliberately human-in-the-loop, with OCR running only on the selected row crop.
- OCR 0.4.0: Expand OCR design notes to document the Tesseract-first direction, quality-guide references, and the current table/gridline limitations.
- OCR 0.4.0: Increase OCR viewer zoom up to 500% and loosen the minimum selectable crop size so tighter field experiments are possible.

## [2026-04-12]

### Added

- OCR 0.3.4: Add the first guided-input pass for constrained banding fields using shared code metadata.

### Changed

- OCR 0.3.4: Reuse banding code metadata from `@birdnerd/shared` for OCR row-entry suggestions instead of hardcoded OCR-only lists.
- OCR 0.3.4: Use native `datalist` suggestions as the lightweight first guided-entry step while keeping the compact OCR row editor layout.

## [2026-04-12]

### Added

- Shared 0.2.0: Add reusable banding code metadata for constrained OCR and field-app inputs.

### Changed

- Field 0.22.0: Rewire the field app to consume shared banding code metadata from `@birdnerd/shared` without changing current behavior.
- Shared 0.2.0: Expand `@birdnerd/shared` beyond domain types to include OCR-relevant banding code tables.

## [2026-04-12]

### Changed

- OCR 0.3.3: Centralize the OCR row draft field schema so draft initialization, editor layout, and CSV export share one source of truth.
- OCR 0.3.3: Refresh the OCR workspace copy so the UI reflects the current review-and-export workflow and version automatically.

### Fixed

- OCR 0.3.3: Remove the nested-button pattern in the sheet annotator so row selection and resize handles use a safer interactive structure.
- OCR 0.3.3: Add keyboard focus/selection handling for row boxes after the annotator structure cleanup.

## [2026-04-12]

### Added

- OCR 0.3.2: Add an export preview table for non-empty OCR row drafts.
- OCR 0.3.2: Add CSV export for reviewed OCR row data using the current draft field order.

### Changed

- OCR 0.3.2: Keep export logic modular with a pure row export utility and a dedicated preview component.

## [2026-04-12]

### Added

- OCR 0.3.1: Expand the left-side row draft fields with additional short coded banding columns including how sexed, skull, cloacal protuberance, brood patch, fat, body molt, flight feather molt, flight feather wear, and juvenile body plumage.

### Changed

- OCR 0.3.1: Rework the row-review layout so the row list, selected-row preview, and row draft editor sit beneath the full-sheet viewer.
- OCR 0.3.1: Reorganize the row editor into collapsible left, middle, and right sections for more focused data entry.
- OCR 0.3.1: Tune the left-side row editor into a compact multi-row coded layout with a wider band-number field and tighter fixed-width tracks.
- OCR 0.3.1: Move review status out of the transcription field strip and into row-level workflow metadata.
- OCR 0.3.1: Left-align row editor controls and section toggles so they stay visually anchored near the row content.

## [2026-04-11]

### Added

- OCR 0.3.0: Add the first usable bandsheet review workspace with image upload, full-sheet viewing, and adjustable zoom.
- OCR 0.3.0: Add manual row box drawing, row selection, row crop preview, and previous/next row navigation.
- OCR 0.3.0: Add row geometry refinement with resize handles for selected rows.
- OCR 0.3.0: Add the first structured row draft editor with fields for bander's initials, code, band number, species alpha code, age, how aged, WRP code, and sex.
- OCR 0.3.0: Add row review status tracking and row summaries in the row list.

### Changed

- OCR 0.3.0: Replace the placeholder OCR landing screen with the first real review workspace layout.
- OCR 0.3.0: Refactor OCR review code into dedicated components, hooks, and geometry utilities with explanatory comments.
- Repo: Add planning notes for OCR branding assets and simple image rotation in later OCR milestones.

### Fixed

- OCR 0.3.0: Tighten row crop preview sizing and offset math so the preview better matches the selected region.

## [2026-04-09]

### Added

- OCR 0.1.0: Scaffold the OCR PWA at `/birdnerd/ocr/`.
- OCR 0.1.0: Add app-specific version display and a minimal placeholder interface.
- Shared 0.1.0: Create the first real shared package.
- Shared 0.1.0: Extract persisted domain types into `@birdnerd/shared`.
- Repo: Add local combined preview tooling for Pages-style testing.
- Repo: Add `docs/repo/` docs for monorepo and deployment notes.

### Changed

- Field 0.21.3: Complete the documentation restructure for the field app and update repo references to the new docs layout.
- Field 0.21.3: Keep the field PWA stable on the monorepo structure while adopting shared domain types from `@birdnerd/shared`.
- Repo: Convert the repo to npm workspaces with `apps/field`, `apps/ocr`, and `packages/shared`.
- Repo: Add combined GitHub Pages deployment for field and OCR under one published site.
- Repo: Move field specs under `docs/apps/field/`.

### Fixed

- Repo: Document and implement the service worker denylist requirement for `/birdnerd/ocr/` so the field PWA does not hijack OCR routes.
