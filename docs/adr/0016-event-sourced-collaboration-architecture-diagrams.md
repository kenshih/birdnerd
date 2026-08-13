# Phase 26 — Assumptive Architecture Diagrams

These diagrams capture the Phase 26 architecture plus the Phase 30 HLC,
server-side initial-access, and restricted-Provisioner decisions. They
intentionally omit Event-catalog tooling beyond the pilot slice, explicit
history merge/adoption, and P2P event signatures.

## Runtime and Trust Model

```mermaid
flowchart LR
  Google[Google OAuth] --> SA[Supabase Auth]
  SA --> Claim[Authenticated initial-access claim<br/>server derives principal + exact email]
  Claim --> Identity[BirdNerd User Account]
  Claim --> Membership[Workspace Membership<br/>Admin or Contributor]
  Membership --> Admission[Supabase Event Admission]

  Provisioner[Deploy-only trusted operator<br/>least-privilege DB login] --> Bootstrap[Non-exposed bootstrap function<br/>no raw Event Log DML]
  Bootstrap -->|canonical bootstrap events| Admission
  Field[Field PWA] -->|authenticated events| LocalLog[Local Event Log]
  LocalLog --> Projector[Deterministic projector]
  Projector --> LocalView[Local projections / UI]

  LocalLog <--> SyncState["@birdnerd/sync-state"]
  SyncState <--> SupabaseAdapter[Supabase event-exchange adapter]
  SupabaseAdapter <--> Admission
  Admission --> SharedLog[Shared append-only Event Log<br/>private table; no browser DML]

  SharedLog -->|pull events| SupabaseAdapter
  SupabaseAdapter --> SyncState

  Projector -. rebuildable cache only .-> ServerCache[Optional server-side projections]

  style SharedLog fill:#e8f5e9,stroke:#2e7d32
  style LocalLog fill:#e3f2fd,stroke:#1565c0
  style ServerCache fill:#fff3e0,stroke:#ef6c00
```

## Package and Contract Structure

```mermaid
flowchart TB
  Schemas["schemas/<br/>YAML-authored restricted JSON Schema IR<br/>portable event contracts"]

  Events["@birdnerd/events<br/>generated TS types + validators<br/>HLC create / observe / compare<br/>decode / validate / upcast"]
  Banding["@birdnerd/banding<br/>pure commands, validation,<br/>pilot event decisions, reducers"]
  Sync["@birdnerd/sync-state<br/>cursors, queue, receipts,<br/>retries, visible sync state"]
  Shared["@birdnerd/shared<br/>lexicon and generic shared material"]

  Field["apps/field<br/>React UI, IndexedDB, PWA"]
  Supabase["Supabase adapter<br/>future implementation detail"]
  P2P["Future P2P adapter"]

  Schemas --> Events
  Events --> Banding
  Events --> Sync
  Shared --> Field
  Banding --> Field
  Sync --> Field
  Supabase --> Sync
  P2P -. later .-> Sync
```

## Event and Projection Behavior

```mermaid
sequenceDiagram
  participant U as Authenticated contributor
  participant F as Field PWA
  participant L as Local Event Log
  participant P as Local projector
  participant S as Sync / Event Admission

  U->>F: Google sign-in
  F->>S: Claim initial Workspace access
  S->>S: Derive principal from session; atomically<br/>link/activate exact pending Membership
  S-->>F: Active access + canonical Events, or no access

  U->>F: Submit command
  F->>F: Structural + authorization checks<br/>soft scientific warnings retained
  F->>L: Append immutable typed event(s)<br/>UUIDv7, command_id, HLC
  L->>P: Replay immediately
  P-->>F: Updated local projection

  Note right of F: Offline events remain queued until sync

  F->>S: Push queued events when online
  S->>S: Derive actor; verify active Membership,<br/>identity/content, and envelope/schema
  S-->>F: Accept or reject each event
  S-->>F: Pull remote events since cursor
  F->>L: Append newly received events
  L->>P: Replay deterministically

  Note right of P: Field level LWW and visible band allocation conflicts
```
