# BirdNerd Domain Glossary

## Workspace

The shared collaboration and data boundary for a group operating BirdNerd. A
Workspace contains its stations, shared operational data, and its members. The
initial rollout has one Workspace containing both banding stations.

## Workspace-Owned Data

The mutable operational data shared by every Workspace Member: people and
memberships, stations and nets, band inventory, sessions and their logs,
banding records, and photo metadata. Static species and code-table references
are bundled locally; transferring photo blobs is outside the first
collaboration release.

## Organization

The real-world permit-holding or administrative body behind BirdNerd work. An
Organization may operate more than one Workspace; it is not itself the data
authorization boundary. The initial rollout has one Organization and one
Workspace.

## Station

A physical banding operation within a Workspace. In the current data model,
this is represented by a Location; each Session occurs at one Station.

## User Account

An authenticated identity that can access BirdNerd. A User Account is linked
to one Person and gains access to shared data through Workspace Membership. A
single User Account may belong to multiple Workspaces.

## Workspace Membership

A User Account's authorization relationship to a Workspace. The initial
membership roles are Admin and Contributor; they govern application access,
not field qualifications. Contributors may create and edit shared operational
data. Admins additionally manage membership, Workspace settings, and
deactivation/removal operations.

## Invitation

An Admin's pre-authorization of a Person's email address to join a Workspace
with a specified membership role. It creates a pending Workspace Membership
that becomes active when the recipient signs in with the authorized identity.
An Invitation need not send an email. Revoking membership does not delete the
Person or their historical work. For the initial Google-only login, an Admin
pre-authorizes the exact Google email; the first matching login activates the
membership. There is no self-service Workspace joining.

## Operational Role

A person's field-work capacity, such as Bander, Extractor, or Data Entry. An
Operational Role does not grant application permissions and a person may hold
more than one.

## Current-State Projection

The syncable, queryable representation of an entity's latest state, derived
from its immutable change history. When concurrent changes conflict, the
projection applies deterministic last-write-wins while retaining both changes
in that history. Every client maintains its own projection by replaying the
Event Log; any server-side projection is a disposable cache or query
optimization, never an authoritative write model.

## Domain Event

An immutable, typed fact describing a completed shared-data change. Domain
Events are BirdNerd's durable source of truth for collaborative data; a small
initial set of event types will replace mutable authoritative entity writes.
Every Domain Event is authored by the authenticated User Account currently
using the device. A shared device is permitted, and that account holder takes
responsibility for its writes; the event author is distinct from any
operational person named in the data.

## Event Log

The append-only ordered collection of Domain Events. The Event Log, rather
than Current-State Projections, is authoritative and can rebuild those
projections. Because BirdNerd has no production data yet, the collaboration
release starts from a clean Event Log rather than migrating historical local
data.

## Offline Work

Writing Domain Events to a device's local Event Log while disconnected. An
already-authorized Workspace Member may work offline; events are synchronized
when connectivity returns. Membership changes require connectivity.

## Canonical ID

The UUIDv7 identifier generated locally for every persistent Workspace-owned
entity and Domain Event. Canonical IDs are collision-safe across offline
devices and are not human-facing labels; station codes, band numbers, and
other operational identifiers remain separate fields. The collaboration
release starts with UUIDv7 data rather than remapping historical local IDs.

## Provisioning

The restricted setup process that creates a Workspace, its first Admin,
operational configuration, and seed data. Provisioning uses the ordinary
command → event → projection pipeline, so the resulting Event Log can be
replayed and validates initial hydration without privileged direct inserts. A
restricted Provisioner, not the Field PWA, owns the first Workspace and Admin
Membership bootstrap path.

## Event Contract

The language- and transport-neutral definition of a Domain Event's envelope,
payload, type, and Event Schema Version. BirdNerd authors Event Contracts in
YAML using a deliberately restricted JSON Schema 2020-12 subset. JSON is the
first transport encoding; TypeScript validators and types are generated from
the contract, and other language or wire-format bindings may be derived later.

## Event Module

The `@birdnerd/events` package, whose Interface creates, decodes, validates,
and upcasts Domain Events while hiding generated bindings and schema-version
details. Its portable source of truth is top-level `schemas/`; it does not own
projections or reducers. `@birdnerd/shared` remains the home of existing
generic shared domain material.

## Banding Domain Module

The `@birdnerd/banding` package. It owns BirdNerd's pure banding semantics:
commands, validation, Domain Event decisions, and deterministic projection
reducers for sessions, bands, records, stations, and related field-work
concepts. Its Interface has no UI, storage, sync, or network dependencies and
can be implemented consistently in another language.

## Command Group

One user-intent command and the zero or more Domain Events it emits, correlated
by a `command_id`. Command-group events are independently appendable,
idempotent, and replayable in any arrival order; projectors tolerate temporary
incompleteness and converge when missing events arrive. Atomic admission is
reserved for an explicitly identified invariant, not a default requirement.

## Band-Allocation Conflict

A visible projection conflict when a managed physical Band has incompatible
active assignments to more than one Banding Record. Both immutable facts remain
in the Event Log; last-write-wins must not hide either record. An Admin resolves
the situation by recording a corrective Domain Event.

## Audit History

A human-readable projection of Domain Events. The Event Log is BirdNerd's only
durable audit history in the new architecture; the former standalone ChangeLog
is retired as a write path.

## Event Bundle

The portable backup/export container for a Workspace's Event Log. It contains
an outer container manifest and version plus Domain Events with their own type
and Event Schema Version; it replaces the former mutable-entity JSON snapshot.
A projection snapshot may be an optional cache but is never authoritative.
V1 restore is a recovery-only, replace-local-replica workflow: imported events
rebuild local projections and later pass through normal authenticated sync
admission. Explicit history merge/adoption is deferred, and unsynced local
events must be protected before replacement.

## Sync-State Module

The `@birdnerd/sync-state` package. It owns generic local event-replication
state—cursors, pending and rejected events, receipts, retries, and visible
sync status—and exposes a small coordinator Interface. Its internal transport
seam supports provider-specific adapters such as Supabase now and P2P later.
It knows Event Contracts but not banding semantics, UI state, or the Field
PWA.

## Event Naming

An Event Contract uses a lowercase, dot-separated `{entity}.{past-tense-verb}`
type name, such as `banding-record.recorded`; the Event Schema Version is a
separate field. Durable contract fields use `lower_snake_case`, while generated
language bindings may adapt their local idiom. Commands use imperative names,
and compound domain nouns use hyphens consistently.

## Draft Event Contract

An Event Contract before the first real shared-data release. Draft contracts
use a simple positive integer per-type schema version but may be changed
destructively, with generated bindings and fixtures recreated from scratch.
At the release lock, emitted versions become immutable and later stored-shape
or semantic changes require a new version with decoding or upcasting support.

## Generated Event Bindings

The committed TypeScript types and validators derived from Event Contracts in
`@birdnerd/events`. Contributors may commit normally, but CI regenerates the
bindings and fails on a diff; branch protection prevents drift from merging to
`main`.

## Conflict Order

The deterministic ordering used to choose a Current-State Projection winner
when changes conflict. BirdNerd will use a hybrid logical clock with the
Domain Event's Canonical ID as the final tie-breaker, rather than trusting
device wall-clock time alone. The precise clock encoding and merge rules are
yet to be specified.

## Field-Level Last-Write-Wins

The projection rule for concurrent amendments: each amendment changes only its
intended fields, and Conflict Order selects a winner independently for each
field. Unrelated concurrent changes compose instead of replacing an entire
entity snapshot; all competing Domain Events remain in the Event Log.

## Event Schema Version

The version of one specific Domain Event type's payload and meaning. Every
Domain Event carries its event type and Event Schema Version; incompatible
changes create a new version of that type, while historical versions remain
decodable or are upcast for replay. There is no global event-schema version.

## Command Validation

The checks applied before a Domain Event is recorded. Commands must satisfy
structural and authorization rules, but scientific plausibility checks remain
soft warnings and never block recording. The warning results evaluated at
write time are retained with the event or its projection for later review.

## Removal

An Admin-authorized Domain Event that deactivates an item or removes it from
active use while retaining its history and references. Routine application
operations never physically delete shared Domain Events or projections; true
data erasure is a separately governed administrative or privacy process.

## Sync Adapter

The replaceable infrastructure boundary that exchanges Domain Events between a
device's local Event Log and shared collaboration infrastructure. The domain
model and projection logic do not depend on a particular provider. The first
adapter uses Supabase Auth and Postgres; PowerSync and RxDB are deferred.

## Identity Provider

The external service that authenticates a person before BirdNerd maps them to
a User Account and Workspace Membership. The initial login surface is Google
OAuth through Supabase Auth, requesting only basic identity scopes. This does
not make Google identity data an authorization source and is replaceable.

## Event Admission

The provider-specific decision to accept or reject a submitted Domain Event.
For the first Sync Adapter, Supabase verifies active Workspace Membership, the
target Workspace, event identity, and envelope/schema validity before
appending. It does not reconcile objects or own projection logic; a future P2P
adapter can implement the same contract with signed events and membership
history. Admission uses membership at upload time: events queued by a device
after the sender is revoked are rejected but retained locally for review or
export.

## Event Signature

An optional cryptographic proof attached to a Domain Event for a future P2P
admission design. Event signatures and their key lifecycle are explicitly
deferred from v1; Supabase-authenticated Event Admission and recorded actor
provenance provide the current trust model.

## Event Retention

The v1 policy of retaining every accepted Domain Event indefinitely. Rebuildable
projection snapshots may improve replay and bootstrap performance but never
replace, compact, or rewrite durable history; exceptional privacy or legal
erasure remains separately governed.

## Collaboration Pilot

The first release-validation scenario: two Stations and two to four Workspace
Members can work online or offline, including two people in parallel at one
physical Station, and their Event Logs converge without silent loss. It proves
visible actor/audit history, Band-Allocation Conflict detection, and Event
Bundle recovery followed by sync catch-up. Real-world crew coordination reduces
conflicts but is not relied on for data safety.
