# Science PWA Architecture Notes

## Vision

Build a local-first science application that:

- Works fully offline
- Supports 2–3+ collaborating stations/users
- Uses immutable domain events as the long-term source of truth
- Syncs through Supabase initially
- Remains evolvable toward P2P/local-first architectures later
- Supports schema evolution over many years
- Maintains scientific auditability and reproducibility

---

# Architectural Principles

## Local First

The application should never depend on the server for normal operation.

```text
UI
 ↓
Local Database (IndexedDB)
 ↓
Domain Commands
 ↓
Domain Events
 ↓
Sync Layer
 ↓
Supabase (today)
P2P (future)
```

The local database is the primary read/write path.

Supabase is a synchronization peer, not "the app".

---

## Immutable Domain Events

Avoid mutable business records as the true source of truth.

Instead:

```text
Event Log
  ↓
Projection Builders
  ↓
Current State Tables
```

Examples:

```text
sample_created
sample_renamed
sample_archived

measurement_recorded
measurement_corrected
measurement_invalidated

note_added
note_edited
```

Events are append-only.

Events are never rewritten.

---

# Current State Tables

Maintain relational tables optimized for UI and querying.

Example:

```sql
samples
measurements
projects
notes
```

These tables are projections/materializations of the event stream.

Benefits:

- Fast UI queries
- Easy filtering/searching
- Easy reporting
- Rebuildable from events

---

# Event Structure

Example:

```ts
interface DomainEvent {
  eventId: string
  eventType: string
  schemaVersion: number

  workspaceId: string
  entityId: string

  createdAt: string
  createdBy: string
  stationId: string

  payload: unknown
}
```

Notes:

- UUIDs generated on client
- Events immutable
- Events independently versioned
- Event payload validated against schema

---

# Schema Evolution

Version by event type.

Good:

```text
measurement_recorded v1
measurement_recorded v2

sample_renamed v1
sample_renamed v2
```

Avoid:

```text
global app schema v17
```

Migration flow:

```text
Load Event
 ↓
Validate Against Original Schema
 ↓
Upgrade Through Migration Chain
 ↓
Current Version
 ↓
Apply Projection
```

Events remain unchanged.

Only interpretation changes.

---

# Package Structure

Monorepo.

```text
repo/
│
├── apps/
│   └── pwa/
│
├── packages/
│
│   ├── domain-events/
│   │   ├── schemas/
│   │   ├── migrators/
│   │   ├── validators/
│   │   ├── event-types.ts
│   │   └── fixtures/
│   │
│   ├── domain-model/
│   │   ├── commands/
│   │   ├── projections/
│   │   └── queries/
│   │
│   ├── sync/
│   │   ├── supabase-adapter/
│   │   ├── powersync-adapter/
│   │   └── p2p-adapter/
│   │
│   └── shared-types/
│
└── infrastructure/
```

---

# Command Pattern

Apps do not write events directly.

Preferred:

```text
UI
 ↓
Command
 ↓
Validation
 ↓
Event
 ↓
Projection
```

Example:

```ts
renameSample(...)
  -> validate
  -> emit sample_renamed.v2
```

Benefits:

- Consistent event generation
- Easier testing
- Easier future migrations

---

# Sync Philosophy

Current target:

```text
IndexedDB
    ↕
Sync Adapter
    ↕
Supabase
```

Future target:

```text
IndexedDB
    ↕
Sync Adapter
    ↕
P2P Network
```

The domain model should not know which sync mechanism is used.

---

# Collaboration Model

Use workspaces.

```sql
workspace_members
-----------------
workspace_id
user_id
role
```

Most tables include:

```sql
workspace_id
created_by
updated_by
station_id
updated_at
deleted_at
version
```

Authorization based on workspace membership.

---

# Conflict Strategy

## Scientific Data

Prefer append-only.

Example:

```text
measurement_recorded
measurement_corrected
measurement_invalidated
```

Avoid editing historical observations.

Benefits:

- Easier sync
- Easier auditing
- Better scientific provenance
- More P2P friendly

---

## Metadata

Examples:

```text
sample name
tags
status
notes
```

Allow edits.

Conflict options:

```text
last-write-wins
manual conflict review
merge strategies
```

Depends on business importance.

---

# Sync Metadata

Each entity should have:

```sql
id uuid
version bigint

created_at
updated_at
deleted_at

created_by
updated_by

station_id
workspace_id
```

Use:

- UUIDs generated locally
- Soft deletes
- Version numbers
- Timestamps

---

# Why This Supports Future P2P

Already P2P-friendly:

- Local-first
- Immutable events
- Append-only history
- Client-generated IDs
- Event versioning
- Projection rebuilding
- Workspace boundaries
- Sync abstraction layer

Still needed later:

- Peer discovery
- Device identity
- CRDTs where appropriate
- Membership replication
- Offline permissions
- Gossip/anti-entropy protocols
- Encrypted peer transport

Estimated overlap:

```text
~70% of architecture reusable
~30% additional distributed-systems work
```

---

# Technology Direction

Current recommendation:

```text
PWA
  +
IndexedDB
  +
Supabase Auth
  +
Supabase Postgres
  +
PowerSync (or RxDB)
```

Avoid building custom sync initially.

Invest effort into:

- Domain events
- Schema evolution
- Projection builders
- Command model

Those decisions survive infrastructure changes.

---

# Core Principle

Treat the event log as the durable truth.

Treat relational tables as rebuildable projections.

Treat sync providers as replaceable infrastructure.
