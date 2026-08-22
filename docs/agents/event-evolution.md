# Event Evolution

Use this workflow whenever a delivery adds an Event type or changes an Event
schema, envelope, meaning, reducer, projection, admission rule, or derived
store whose contents depend on replay. Its purpose is to keep the desired
design clear while making compatibility with already-persisted Events an
explicit delivery gate.

## Ordered design passes

### 1. Design the desired current behavior

First design the Event Contract and the Module Interfaces that new code should
use. Settle the domain fact, invariants, ownership, authorization, ordering,
errors, and projection behavior without preserving an obsolete shape inside
the new Interface merely because old Events exist.

The output of this pass is the desired canonical model. It is not yet a
delivery-ready design.

### 2. Design historical compatibility

After the desired design is understandable, inventory every place where prior
released state may exist:

- immutable Events in local replicas, Supabase, and Event Bundles;
- pending outbound Events, receipts, cursors, and other sync metadata;
- IndexedDB schemas and projection caches; and
- server-side admission indexes or other state derived from the Event Log.

Record the supported Event envelope and per-type schema versions, including
the oldest version that can still exist. For each affected surface, choose an
explicit strategy:

- **Decode unchanged** when the historical representation already has the
  required meaning.
- **Upcast on read/replay** when an older immutable Event needs a deterministic
  canonical representation. Upcasters preserve Event identity and history;
  they do not rewrite the Event Log.
- **Backfill or rebuild derived state** when a new index, cache, or projection
  needs facts from Events that predate it. Server backfills are versioned,
  idempotent migrations. Local derived caches should normally be rebuilt from
  the Event Log; backfills never mutate historical Events. Durable local
  metadata needs an explicit migration when it cannot be rebuilt.
- **Reject with a support boundary** only when the product explicitly chooses
  to stop supporting a historical version. That is a data/recovery decision,
  not an incidental parser failure, and must account for offline replicas and
  exported bundles.

Also check mixed-version and out-of-order operation. A new Event written after
replaying old Events, a delayed old Event arriving after new Events, and an
idempotent retry must all preserve the Event and projection invariants.

Put the resulting compatibility matrix in the delivery Issue or PR:

| Surface | Prior persisted input | Strategy | Acceptance evidence |
| --- | --- | --- | --- |
| Event decode/replay | Supported envelope and schema versions | unchanged, upcast, or explicit boundary | fixture replay |
| Local replica | IndexedDB, queue, metadata, cache | migrate, preserve, or rebuild | prior-version upgrade and reload |
| Server | Event Log and derived indexes | idempotent backfill/rebuild | migration from prior deployed state |
| Exchange/bundles | delayed Events and exported history | accept/upcast or explicit boundary | mixed-version sync/restore |

Use `None — reason` rather than omitting a row. The compatibility pass may
change the implementation plan, but it should not obscure the desired current
Interface established in the first pass.

## Replay evidence

An isolated upcaster unit test is necessary but not sufficient. Keep
non-sensitive, deterministic fixtures representing prior released Event and
persistence states, and test the boundaries where replay actually occurs. As
applicable, prove:

1. a prior Event Log hydrates to the expected current projection;
2. a new command committed after that hydration does not drop or reinterpret
   historical facts;
3. reload/rebuild produces the same result;
4. a database migration backfills derived server state from Events already in
   the log before dependent Events are admitted;
5. old and new Events converge across pull, retry, and out-of-order delivery;
   and
6. a supported older Event Bundle restores and then catches up normally.

Fixtures should represent the last actually shipped/deployed states, not only
fresh databases constructed under the new schema. When a regression exposes a
previously missing historical state, preserve it as a fixture or equivalent
migration test.

## Completion gate

An Event-affecting delivery is ready for implementation only when its contract
separately states:

- the desired current design;
- supported historical versions and persisted states;
- each required upcaster, migration, backfill, or rebuild;
- the replay and upgrade evidence that will prove compatibility; and
- any intentionally unsupported history and its recovery path.

Before a PR is review-ready, run that evidence from prior persisted state and
record the result. A green test suite built only from a fresh current schema
does not satisfy this gate.

## Future compaction

Compaction is a separate architectural and data-retention decision, not part
of ordinary Event evolution. BirdNerd currently retains accepted Events as its
audit history. Any future checkpoint, snapshot, archive, or deletion process
requires an accepted ADR covering at least audit and recovery guarantees,
checkpoint validation, offline or long-stale replicas, Event Bundles,
idempotency, rollback, and the minimum supported Event-version window.

Compaction can reduce replay volume, but it does not by itself end support for
old Event versions: those Events may still arrive from an offline device or an
older bundle. Retiring a version therefore requires both a verified compacted
recovery point and an explicit protocol/product boundary for every remaining
source of historical Events.
