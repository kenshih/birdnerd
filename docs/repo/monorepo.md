# BirdNerd — Monorepo Notes

This repository is organized as an npm workspaces monorepo.

## Workspace Roles

- `apps/field/` — production BirdNerd field PWA
- `apps/ocr/` — OCR companion PWA
- `apps/provisioner/` — local-only admin CLI for closed-pilot Workspace setup;
  never part of the Field PWA
- `packages/events/` — draft Event Contract bindings and codec boundary
- `packages/banding/` — pure domain event decisions and projections
- `packages/sync-state/` — generic local event-log and future sync state
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

## Collaboration Package Direction (Phase 28 baseline)

Phase 28 establishes the package and contract skeleton below. It intentionally
stops before the durable IndexedDB event store, generated bindings, and a
network adapter; those are Phases 29–30 work.

- `schemas/` — portable YAML-authored draft Event Contracts using a restricted
  JSON Schema subset. Phase 29 adds the generator and drift protection.
- `packages/events/` (`@birdnerd/events`) — draft TypeScript bindings plus
  create/decode/validate behavior for the Workspace slice. They are handwritten
  until Phase 29 generation replaces them.
- `packages/banding/` (`@birdnerd/banding`) — pure banding commands,
  validation, event decisions, and deterministic reducers. It does not import
  UI, IndexedDB, network, sync, or Supabase code.
- `packages/sync-state/` (`@birdnerd/sync-state`) — generic local
  event-log state and future provider-adapter seam. Its Phase 28 in-memory log
  admits every loaded event but has no persistence or transport. It knows Event
  Contracts but not banding semantics or Field-PWA state.

`apps/provisioner/` emits `workspace.created` and pending Membership events to
a local draft JSON Event Log through the same admission function it tests. It
never writes a projection or database row. The JSON file is a local
test/harness hand-off, not an Event Bundle or a way to provision Field devices;
Phases 29–30 replace that boundary.

`packages/shared/` remains the home of existing generic shared material such
as the lexicon. See
[ADR 0016](../adr/0016-event-sourced-collaboration-architecture.md)
for the architecture decision.
