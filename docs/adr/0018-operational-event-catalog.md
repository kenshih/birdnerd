# Phase 31 operational Events use role-gated admission and reference indexes

**Status:** accepted
**Date:** 2026-08-20
**Decided in:** Phase 31 delivery planning

## Context

Phase 30 proved shared append, pull, recovery, and a deliberately small
Session/Banding Record projection. Phase 31 replaces the pilot and the mutable
Field replica, so it must freeze the operational Event Catalog, make offline
inventory semantics unambiguous, and prevent a browser from submitting
configuration Events that its Workspace role cannot authorize.

The server must enforce authorization and Workspace isolation without becoming
an authoritative operational projector. Event batches may also arrive with a
referenced parent missing because command-group Events and replicas exchange
independently.

## Decision

### Operational Module Interface

`@birdnerd/banding` exposes one discriminated operational command Interface
and one current-state projection Interface. A command decision receives the
Workspace, authenticated actor, Membership role, current projection, and
caller-supplied Event identity/HLC context, and returns immutable Events plus
soft warnings. The Module owns structural transitions, authority rules,
upcasting into canonical facts, field-level last-write-wins, lifecycle state,
and conflict derivation. React, IndexedDB, synchronization, and Supabase stay
outside it.

Projectors are order-independent. They select each field by HLC and then Event
ID, keep lifecycle state separate from fields, allow a corrective amendment to
an inactive entity without reactivating it, and require an explicit
reactivation Event. A temporarily unresolved reference remains visible and
converges when its parent Event arrives.

### Event Catalog

Every persistent operational entity is Workspace-scoped. IDs and structural
references are required; scientific and observational values remain optional
and produce soft warnings rather than save blockers. In amendment payloads,
an omitted key means unchanged and JSON `null` means explicitly cleared.

| Authority | Event families |
| --- | --- |
| Admin in Field | `station.created`, `station.fields-amended`, `station.deactivated`, `station.reactivated`; the corresponding four `net`, `person`, and `bander` events; `user-account.person-linked`, `user-account.person-unlinked` |
| Contributor or Admin in Field | `band.received`, `band.fields-amended`, `band.deactivated`, `band.reactivated`; `session.created`, `session.fields-amended`, `session.deactivated`, `session.reactivated`; `session-crew-member.added`, `session-crew-member.removed`; `banding-record.created`, `banding-record.fields-amended`, `banding-record.deactivated`, `banding-record.reactivated` |
| Server-only Membership paths | trusted operator: existing `membership.preauthorized` plus new `membership.role-changed`, `membership.deactivated`, and `membership.reactivated`; initial-access claim: existing `membership.activated` |

The already-shared Phase 30 `session.created`, `banding-record.created`, and
`banding-record.fields-amended` v1 payloads remain immutable. Phase 31 adds v2
contracts for their complete non-photo forms and deterministic v1 upcasters.
The Event envelope accepts a positive per-type `event_schema_version`, and the
generator/runtime dispatches by type plus version instead of assuming one
version per type. New Event types begin at v1.

Session crew is a relationship fact keyed by `(session_id, bander_id)`; it
does not require another canonical entity ID. Phase 31 keeps the active Net
picker by Station but emits no Session-Net effort Events. `SessionNetLog` and
Net Hours remain deferred.

### Inventory and band selection

Band selection on a Banding Record is one atomic discriminated value:

- managed: Band ID plus band-number snapshot;
- foreign: free-text band number;
- unbanded; or
- `null` when an amendment explicitly clears the selection.

A missing local Band projection is unresolved, never evidence that a band is
foreign. Managed Band deployment state is derived from active Banding Record
facts, not a separate `band.deployed` Event. Repeated records for a physical
Band are valid recaptures; a Band-Allocation Conflict exists only for
incompatible active new-deployment claims (the current `1`/`N` capture-code
semantics), not merely because more than one encounter references the Band.
Capture code remains optional; a missing or inconsistent code yields a soft
warning and cannot silently turn a managed selection into a foreign one.

Concurrent receipt of the same normalized band number under different Band
IDs produces a visible Band-Number Conflict. Replicas neither reject nor
silently merge those offline facts. A Contributor resolves either inventory or
allocation conflicts with later amendment/deactivation Events; history remains
intact.

`band.received` carries the structural Band ID and display number plus optional
size/type metadata; batch receipt remains one command with one retryable Event
per physical Band. Amendments use field-level LWW and explicit clears. Band
status is deliberately absent from both contracts: the projection derives
available/deployed/lost/destroyed/replaced state, species, dates, and encounter
history from active Record facts in Event conflict order, while Band lifecycle
Events alone derive inactive/retired state. This avoids a mutable status that
can diverge from immutable encounter history.

### Event Admission

The browser append RPC enforces a static Event-type-to-minimum-role table from
the derived Membership index. Contributor Events require active Contributor or
Admin Membership; configuration Events require active Admin Membership.
Membership lifecycle Events are never accepted from the browser, even from an
Admin.

A minimum derived entity-reference index records canonical entity ID, kind,
and Workspace from creation/receipt Events. Admission rejects a duplicate
entity identity and any known cross-Workspace or wrong-kind reference. An
unknown dependency is retryable—not permanent—so independently delivered
Events retain liveness. A batch is evaluated in input order, allowing a parent
earlier in that batch to satisfy a later reference. This index is an admission
aid, not a business/current-state projection; duplicate human labels such as a
band number remain domain conflicts rather than admission failures.

The Event-exchange receipt union therefore adds `deferred` for a retryable
admission dependency. Sync-State leaves that Event effective in the local
projection and pending in the outbound queue, records the reason/attempt, and
schedules bounded backoff. Only a permanent `rejected` receipt removes an
Event from the effective projection and asks for attention; accepted and
duplicate behavior is unchanged.

### Out-of-app Membership administration

Phase 31 adds `invite`, `set-role`, `deactivate`, and `reactivate` operations to
the existing trusted Provisioner CLI. There is no Field membership-management
screen. Each command calls a narrow non-exposed `SECURITY DEFINER` function
that validates exact normalized email/IDs, constructs canonical Membership
Events, updates the Membership admission index in the same transaction, and
returns an idempotent audit receipt. The functions refuse to demote or
deactivate the last active Admin.

The Provisioner runtime role receives EXECUTE only on these functions and has
no raw Event Log or Membership DML. Its credential remains separate from the
schema deployer and never enters the repository, Field bundle, or device.

### User Account and roster linkage

An Admin may link a User Account to at most one active Person in each
Workspace. Link/unlink Events use deterministic last-write-wins. Field
pre-fills the Bander control only when the linked Person has an active Bander
projection; the control stays editable and names/emails are never used to
infer a link.

## Consequences

- Role enforcement is duplicated intentionally: the pure domain Module gives
  immediate offline feedback, while Supabase is the final trust boundary for
  untrusted browser Events. Supabase still does not reconcile business state.
- The entity-reference index adds server state, but only the minimum needed to
  guarantee Workspace isolation and typed references without a server-owned
  operational projection.
- Membership administration requires connectivity and a trusted operator;
  the first operational release avoids an in-app access-management surface.
- Per-event upcasting and nullable amendment fields increase contract tooling
  work but preserve already-shared Events and make explicit clearing portable.
- The mutable `birdnerd` database and DataBundle can retire only after the
  two-Station acceptance proves the complete default Event-backed workflow.
