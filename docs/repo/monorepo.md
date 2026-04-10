# BirdNerd — Monorepo Notes

This repository is organized as an npm workspaces monorepo.

## Workspace Roles

- `apps/field/` — production BirdNerd field PWA
- `apps/ocr/` — OCR companion PWA
- `packages/shared/` — app-agnostic shared domain package

## Documentation Scope

- `docs/plan.md` is repo-level and tracks cross-app roadmap work
- `docs/apps/field/` contains the current field app specs
- OCR docs stay lightweight for now and can grow as the app matures
- `docs/repo/` is for monorepo, deployment, and other shared infrastructure notes

## Boundary Rule

Keep app-specific concerns inside each app:
- UI and routing
- IndexedDB wiring
- PWA/service worker config
- app assets

Use `packages/shared/` only for app-agnostic domain code that can be consumed cleanly by both apps.
