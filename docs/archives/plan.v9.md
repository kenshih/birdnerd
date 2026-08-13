# BirdNerd — Plan archive v9 (Phase 29)

Archived from `docs/plan.md` on 2026-08-13 after [PR #11](https://github.com/kenshih/birdnerd/pull/11)
merged. Field 0.29.0 shipped the Local Event Core. The forward-looking plan
continues in [docs/plan.md](../plan.md); shipped-change detail also lives in
[CHANGELOG.md](../../CHANGELOG.md).

---

## Phase 29 — Local Event Core (Field 0.29.0) ✅

Completed the durable local collaboration foundation without migrating legacy
Field data or advancing Supabase exchange ahead of Phase 30:

- `schemas/workspace/` is the portable YAML/JSON-Schema source of truth for
  the Workspace-access Event Contracts. Committed TypeScript bindings and
  structural validation are generated from those contracts; CI detects drift.
- `@birdnerd/events` owns UUIDv7 generation, canonical validation, JSON
  Event-Log codecs, and the upcast boundary. `@birdnerd/banding` owns pure
  Workspace admission and projection; `@birdnerd/sync-state` owns generic
  append/idempotency behavior.
- Field persists an authoritative append-only Event Log and a rebuildable
  Workspace-access projection cache in the separate `birdnerd-event-core`
  IndexedDB database. The legacy mutable `birdnerd` database is neither read,
  migrated, nor deleted. Pending Membership activation is durable, idempotent,
  and constrained to its Membership Workspace.
- New Field entity IDs and recreated test/initial-hydration fixture IDs use
  UUIDv7 with valid internal references. The old mutable `DataBundle` remains
  available for legacy data until Event Bundle recovery is delivered.
- Pull-request CI now runs generated-binding drift checks, lint, Field unit
  tests, collaboration-package tests, and Field/OCR/sync-db builds. Playwright
  remains intentionally local-only.

Deferred to Phase 30 and later: Provisioner-to-device hand-off, authenticated
Supabase Event Admission/exchange, queue/cursor/retry state, multi-device
convergence, Event Bundle recovery UI, and operational field-data Event
Contracts/commands.
