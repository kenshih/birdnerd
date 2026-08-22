# BirdNerd — Roadmap archive v2 (Phases 21–40)

This rolling archive records Phase 21 onward and remains open through Phase
40. The active roadmap is [plan.md](../plan.md); shipped release detail is in
the [changelog](../../CHANGELOG.md) and the applicable specifications.

---

## Completed and recorded phase outcomes

| Phase | Status | Outcome |
|-------|--------|---------|
| 21 | Complete | Monorepo migration: Field and OCR workspaces, a shared package, and reorganized documentation. |
| 22 | Partially complete | Bandsheet-OCR foundation through 0.4.1: image and row review, guided entry/export, browser OCR, and constrained row prefill. Remaining OCR work stays in the active backlog. |
| 23 | Partially complete / superseded | P2P spike through 0.2.0: a Yjs/WebRTC baseline and synchronized record shape. The integration path was superseded by the Phase 26 Supabase decision; the research remains separately labelled in the backlog. |
| 24 | Complete | Field form/code corrections, inventory and read-only view improvements, export support, and local end-to-end regression coverage. |
| 25 | Complete | Re-runnable master-sheet CSV import with preview, warnings/rejects, entity derivation, and lost/destroyed-band handling. |
| 26 | Complete | Long-term collaboration architecture decision, captured in [ADR 0016](../adr/0016-event-sourced-collaboration-architecture.md). |
| 27 | Complete | Google-only Supabase sign-in surface and a provider-neutral authentication seam. |
| 28 | Complete | Workspace-access vertical slice: portable event contracts, local admission/projection, and provisioning hand-off. |
| 29 | Complete | Durable local event core: contracts, event log, rebuildable projection, UUIDv7 identity, and collaboration-package checks. |
| 30 | Complete | Authenticated Supabase event exchange, offline replication/recovery, field-domain event commands, and a two-Station collaboration pilot; Field 0.30.1 corrected linked-Google-identity claims. |
| 31 | Complete | Field 0.31.0 made the operational event-backed workflow the default, and Field 0.31.1 added historical Event compatibility, entity-reference-index backfill, and reliable deferred retry. The two-Station acceptance passed. Legacy mutable data remains deliberately unlinked and unchanged; any deletion is separately scoped. |

## Durable delivery references

- [ADR 0016](../adr/0016-event-sourced-collaboration-architecture.md) — collaboration architecture.
- [Field product specification](../apps/field/product-specifications.md), [technical specification](../apps/field/tech-specifications.md), and [UX specification](../apps/field/ux-specifications.md) — current behavior and design.
- [CHANGELOG.md](../../CHANGELOG.md) — versioned shipped-change history.
