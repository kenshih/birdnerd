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

## Approved Collaboration Package Direction (Phase 26)

The following structure is planned for the collaboration sequence; it is not
implemented yet.

- `schemas/` — portable YAML-authored Event Contracts using a restricted JSON
  Schema subset; no TypeScript or runtime behavior.
- `packages/events/` (`@birdnerd/events`) — generated TypeScript bindings plus
  create/decode/validate/upcast behavior for events.
- `packages/banding/` (`@birdnerd/banding`) — pure banding commands,
  validation, event decisions, and deterministic reducers. It does not import
  UI, IndexedDB, network, sync, or Supabase code.
- `packages/sync-state/` (`@birdnerd/sync-state`) — generic local
  event-replication state and its provider-adapter seam. It knows Event
  Contracts but not banding semantics or Field-PWA state.

`packages/shared/` remains the home of existing generic shared material such
as the lexicon. See
[ADR 0016](../adr/0016-event-sourced-collaboration-architecture.md)
for the architecture decision.
