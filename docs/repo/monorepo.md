# BirdNerd — Monorepo Notes

This repository is organized as an npm workspaces monorepo.

## Workspace Roles

- `apps/field/` — production BirdNerd field PWA
- `apps/ocr/` — OCR companion PWA
- `apps/provisioner/` — local-only admin CLI for closed-pilot Workspace setup;
  never part of the Field PWA
- `packages/events/` — generated Event Contract bindings and codec boundary
- `packages/banding/` — pure domain event decisions and projections
- `packages/sync-state/` — provider-neutral durable replication coordination
- `packages/shared/` — app-agnostic shared domain package

## Documentation Scope

- `docs/plan.md` is repo-level and tracks cross-app roadmap work
- `docs/repo/roadmap-maintenance.md` owns the roadmap update and archive procedure
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

## Collaboration Package Direction (Phases 30–31 event exchange)

Phase 29 established generated portable contracts and Field's durable local
Workspace Event Log. Phase 30 adds the HLC envelope, pilot Event catalog,
Supabase Event Admission/exchange, and durable replication state. Phase 31
extends that catalog with operational configuration, roster, inventory, v2
Session/Record forms, deferred-reference receipts, and Provisioner Membership
lifecycle operations.

- `schemas/` — portable YAML-authored Event Contracts using a restricted JSON
  Schema subset. `npm run generate:event-bindings` writes the committed
  TypeScript output; CI runs `npm run check:event-bindings` to prevent both
  generated-binding and Supabase SQL-validator drift.
- `packages/events/` (`@birdnerd/events`) — generated TypeScript bindings and
  structural Contract validation plus UUIDv7, create/decode/validate/upcast
  behavior. It does not own projections or storage.
- `packages/banding/` (`@birdnerd/banding`) — pure banding commands,
  validation, event decisions, and deterministic reducers. It does not import
  UI, IndexedDB, network, sync, or Supabase code.
- `packages/sync-state/` (`@birdnerd/sync-state`) — deep replication Module for
  push receipts, server-sequenced pulls, durable cursor commits, retries, and
  visible sync state behind an Event-exchange Seam. It knows Event Contracts
  but not banding semantics, Field IndexedDB, Supabase, or UI state.

`apps/field/` owns the durable `birdnerd-event-core` IndexedDB database:
accepted Event Log entries and an expendable projection cache. It starts clean
and never migrates the legacy mutable `birdnerd` database.

`apps/provisioner/` is a deploy-only trusted-operator Adapter. Its restricted
database login can execute only the private bootstrap and Membership lifecycle
functions, which append canonical Events and return audit receipts. It is never
bundled with Field, does not create Auth users, and is the only Membership
administration path.

`packages/shared/` remains the home of existing generic shared material such
as the lexicon. See
[ADR 0016](../adr/0016-event-sourced-collaboration-architecture.md)
for the architecture decision.
