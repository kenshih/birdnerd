# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adapted for BirdNerd's multi-app monorepo.

## [Unreleased]

### Changed

- Field: Move `birdnerd-full-sample.json` into `apps/field/examples/`.

### Added

- Repo: Add a repo-level changelog to track shipped changes separately from the forward-looking plan.

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
