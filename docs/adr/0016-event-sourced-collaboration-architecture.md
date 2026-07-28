# Phase 26 — Collaboration Architecture Decision

**Status:** accepted  
**Date:** 2026-07-28  
**Decided in:** Phase 26 — Long-term Architecture Review

BirdNerd now has an immediate collaboration trigger: two banding stations and
two to four real members need to use the Field PWA, sometimes concurrently at
one station. The collaboration architecture therefore precedes the previously
planned Net Reconciliation, Net Hours, and Smart Band Entry work.

The diagrams in
[0016-event-sourced-collaboration-architecture-diagrams.md](0016-event-sourced-collaboration-architecture-diagrams.md)
show the agreed architecture.

## Decision

- A **Workspace** is the shared data and authorization boundary. The initial
  Organization has one Workspace containing both Stations. A User Account may
  belong to multiple Workspaces.
- User Accounts authenticate through **Google OAuth via Supabase Auth**. The
  Field app maps that external identity to its own User Account and Workspace
  Membership; authorization remains BirdNerd-owned. The initial login surface
  is Google-only, requests only basic identity scopes, and has no self-service
  Workspace joining.
- Admins pre-authorize an exact Google email address for a Person and pending
  Workspace Membership. The first matching login activates it. Initial roles
  are Admin and Contributor; operational roles such as Bander, Extractor, and
  Data Entry remain separate from permissions.
- Typed immutable **Domain Events** are the durable source of truth. Clients
  replay events into rebuildable Current-State Projections. Every client owns a
  local projection; any server-side projection is an optional cache, never an
  authoritative write model.
- Events use locally generated **UUIDv7** identifiers. Current-state conflict
  resolution is deterministic, field-level last-write-wins using a hybrid
  logical clock and event-ID tie-breaker. The clock encoding remains to be
  designed.
- Commands enforce structural and authorization checks; scientific data-quality
  checks remain soft warnings recorded with the event/projection. Command
  groups favor liveness: their events append and replay independently, with a
  `command_id` for correlation and idempotent retry. Atomicity is an explicit
  exception for a proven invariant.
- Physical-band collisions are not silently resolved. Both facts remain in the
  Event Log and the projection surfaces a Band-Allocation Conflict for Admin
  correction.
- Routine removal emits a deactivation/removal event. The Event Log is the
  only audit history and supersedes the old ChangeLog write path. Accepted
  events are retained indefinitely in v1; privacy/legal erasure is separately
  governed.
- Event Contracts are authored in `schemas/` as YAML using a restricted JSON
  Schema 2020-12 subset. JSON is the first transport. Every event type has its
  own integer schema version; draft contracts can reset freely until the first
  shared-data release freezes them. Generated TypeScript types and validators
  are committed and CI rejects generation drift.
- `@birdnerd/events` owns generated event bindings plus create/decode/validate/
  upcast behavior. `@birdnerd/banding` owns pure banding commands, validation,
  event decisions, and reducers. `@birdnerd/sync-state` owns generic event
  replication state and its internal provider-adapter seam. These packages do
  not own Field UI, IndexedDB wiring, or provider-specific behavior.
- Supabase is the first event-exchange provider, behind the Sync-State seam.
  It performs Event Admission—validating active Workspace Membership, target
  workspace, event identity, and envelope/schema—then appends or rejects. It
  does not reconcile objects. PowerSync, RxDB, P2P, and cryptographic event
  signatures are deferred.
- The first Workspace and Admin are created by a restricted Provisioner, not
  the Field PWA, but it emits the same canonical events and uses the ordinary
  admission/projection path.
- Event Bundles replace mutable-entity JSON bundles. V1 restore replaces and
  rebuilds a local replica, protects unsynced local events, and later catches
  up through normal authenticated sync. Explicit history merge/adoption is
  deferred.

## Initial Collaboration Sequence

1. **Google OAuth and identity linkage** — prove Google sign-in and map an
   external identity to a BirdNerd User Account. Do not provision Workspaces
   through the Field app yet.
2. **Workspace vertical slice** — scaffold the package structure and prove the
   restricted Provisioner can emit and project `workspace.created` plus initial
   Admin membership end-to-end. Incomplete implementations are acceptable
   outside this slice.
3. **Complete local event core** — implement portable contracts, UUIDv7,
   `@birdnerd/events`, `@birdnerd/banding`, and the clean local event/projection
   store. BirdNerd has no production data, so test and hydration data are
   recreated rather than migrated.
4. **Supabase admission and collaboration pilot** — complete
   `@birdnerd/sync-state`, the Supabase event exchange, offline behavior, and
   multi-device validation.

## Pilot Success Criteria

- Two Stations and two to four Workspace Members can work using the same
  Workspace.
- Two contributors can work concurrently at one physical Station/session as
  well as at separate Stations.
- Online and offline event logs converge without silent loss.
- Actor/audit history is visible; conflicting physical-band assignments remain
  visible for correction.
- A device can rebuild from an Event Bundle and catch up through sync.

## Explicit Deferrals

- Exact hybrid-logical-clock encoding and merge algorithm
- Restricted Provisioner authority mechanics
- Initial event-catalog and schema-generator implementation details
- Event signatures, device keys, and P2P admission
- History merge/adoption UI and workflow
- PowerSync/RxDB evaluation and any server-side projection cache
