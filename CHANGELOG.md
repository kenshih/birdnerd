# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adapted for BirdNerd's multi-app monorepo.

## [Unreleased]

### Changed

- Field: Move `birdnerd-full-sample.json` into `apps/field/examples/`.

### Added

- Repo: Add a repo-level changelog to track shipped changes separately from the forward-looking plan.

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
