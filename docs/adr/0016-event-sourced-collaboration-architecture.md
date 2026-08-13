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
  Workspace Membership. The first matching Google login calls a server-side
  initial-access claim: it derives the Google principal from the authenticated
  session, exact-email-matches the pending Membership, and atomically emits
  `user-account.linked` and `membership.activated` while updating the derived
  admission index. Only that committed active result permits ordinary pull or
  push. Event JSON never supplies a trusted actor identity. Initial roles are
  Admin and Contributor; operational roles such as Bander, Extractor, and Data
  Entry remain separate from permissions.
- Typed immutable **Domain Events** are the durable source of truth. Clients
  replay events into rebuildable Current-State Projections. Every client owns a
  local projection; any server-side projection is an optional cache, never an
  authoritative write model.
- Events use locally generated **UUIDv7** identifiers. Phase 30 introduces an
  envelope v2 HLC tuple, `{ physical_ms, logical }`, where both values are
  non-negative safe integers. `@birdnerd/events` owns pure clock behavior:
  `tick(now)` returns `(now, 0)` when `now` exceeds the local physical value,
  otherwise it retains that physical value and increments `logical`.
  `observe(remote, now)` sets physical time to the maximum of local, remote,
  and `now`; its logical value is zero when `now` alone wins, otherwise it is
  the winning logical value plus one (or `max(local, remote) + 1` when they
  tie). Counter overflow is a visible local write failure, never a wrapped or
  silently reordered clock. Field durably retains the per-replica high-water
  mark.
  Current-state field-level last-write-wins compares `physical_ms`, then
  `logical`, then `event_id`.
  Existing v1 local Events remain immutable: decode, bundles, and admission
  deterministically upcast them to v2 using the validated, finite,
  non-negative-safe-integer Unix milliseconds of `occurred_at` as
  `physical_ms` and `logical: 0`, retaining their event ID and payload.
  Upcast uses one shared RFC 3339 parser rather than platform date parsing:
  convert fractional seconds to milliseconds by retaining its first three
  digits (right-pad if shorter, discard later digits), apply the numeric
  offset, and interpret a permitted `:60` leap second as `:59` plus exactly
  one second. Thus `2016-12-31T23:59:60.250Z` maps to
  `2017-01-01T00:00:00.250Z`. New pilot Events are v2. This makes offline
  edits and clock regression converge without treating wall-clock time as
  authoritative.
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
  Its browser Interface is only the authenticated initial-access claim, append
  receipts, and server-sequenced pull pages. The initial-access claim is the
  only route from a Google session to active Membership. Event Admission
  derives the caller from the server-authenticated principal, validates active
  Workspace Membership, target workspace, immutable event identity/content,
  and envelope/schema, then appends or rejects. It does not reconcile objects.
  The Event Log and derived Membership/index tables receive no browser DML;
  browser roles receive only narrowly granted RPC execution. The Event Log has
  unique `event_id` and indexed `(workspace_id, server_sequence)` access, with
  Membership/RLS lookup indexes. PowerSync, RxDB, P2P, and cryptographic event
  signatures are deferred.
- A restricted, **deploy-only trusted operator** bootstraps the first
  Workspace and pending Workspace Memberships, never the Field PWA. It emits
  ordinary `workspace.created` and `membership.preauthorized` Events for exact
  Google email addresses through the canonical admission/projection path. It
  does not create Supabase Auth users: a later matching Google login links the
  BirdNerd User Account and activates the pending Membership. The migration
  deployer and Provisioner runtime credential are separate. The latter is a
  login role limited to executing one non-exposed bootstrap function; it has no
  raw Event Log or Membership DML. That `SECURITY DEFINER` function has a safe
  fixed search path, revoked `PUBLIC` execution, a grant only to the
  Provisioner role, and returns an audit receipt. Its credential remains in the
  trusted deployment environment, never a Field device or browser bundle.
- Event Bundles replace mutable-entity JSON bundles. V1 restore replaces and
  rebuilds a local replica only after validating its format, every Event,
  manifest/Event Workspace IDs, and upcast compatibility without changing
  IndexedDB. Restore requires an active Membership for that manifest Workspace
  and protects unsynced local events before replacement, then catches up
  through normal authenticated sync. Explicit history merge/adoption is
  deferred.

## Initial Collaboration Sequence

1. **Google OAuth and identity linkage** — prove Google sign-in and map an
   external identity to a BirdNerd User Account. Do not provision Workspaces
   through the Field app yet.
2. **Workspace vertical slice** — scaffold the package structure and prove the
   Provisioner can emit and project `workspace.created` plus initial Admin
   membership end-to-end. Incomplete implementations are acceptable outside
   this slice.
3. **Complete local event core** — implement portable contracts, UUIDv7,
   `@birdnerd/events`, `@birdnerd/banding`, and the clean local event/projection
   store. BirdNerd has no production data, so test and hydration data are
   recreated rather than migrated.
4. **Supabase admission and collaboration pilot** — complete
   the server-side initial-access claim, `@birdnerd/sync-state`, the Supabase
   event exchange, offline behavior, and multi-device validation. The smallest
   operational catalog comprises
   `session.created`, `banding-record.created`, and
   `banding-record.fields-amended`; it includes physical-band assignment so a
   conflict can remain visible for Admin correction. It is the first catalog to
   use the HLC envelope and field-level last-write-wins reducer behavior.

## Pilot Success Criteria

- Two Stations and two to four Workspace Members can work using the same
  Workspace.
- Two contributors can work concurrently at one physical Station/session as
  well as at separate Stations.
- Online and offline event logs converge without silent loss.
- Actor/audit history is visible; conflicting physical-band assignments remain
  visible for correction.
- A device can rebuild from an Event Bundle and catch up through sync.
- Each pilot participant runs the Phase 30 Field build before exercising the
  shared Workspace.

## Explicit Deferrals

- Operational Event Catalogs beyond the pilot Session and Banding Record slice
- Event signatures, device keys, and P2P admission
- History merge/adoption UI and workflow
- PowerSync/RxDB evaluation and any server-side projection cache
