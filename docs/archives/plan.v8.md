# BirdNerd — Plan archive v8 (Phases 26–28)

Archived from `docs/plan.md` on 2026-08-12 once Field 0.28.0 shipped the
Workspace vertical slice. The forward-looking plan continues in
[docs/plan.md](../plan.md). Shipped-change detail also lives in
[CHANGELOG.md](../../CHANGELOG.md).

---

## Phase 26 — Long-term Architecture Review ✅

Completed design phase. The real trigger is present: two Stations and two to
four members need concurrent, offline-capable collaboration. [ADR
0016](../adr/0016-event-sourced-collaboration-architecture.md) is the
consolidated decision; its [diagram companion](../adr/0016-event-sourced-collaboration-architecture-diagrams.md)
visualizes it; [docs/adr/](../adr/) records the durable decisions.

Also completed: `packages/shared/src/lexicon.ts` (shared 0.2.5), the canonical
`LexiconEntry[]` for ~38 banding terms. TypeScript now; YAML migration remains
a future portability step.

---

## Phase 27 — Google OAuth Sign-in Surface (Field 0.27.0) ✅

Proved Google-only OAuth through Supabase Auth and established a
provider-neutral external identity seam. Field does not provision Workspaces.

Completed: Google-only Supabase Auth is configured and Field 0.27.3 provides a
sign-in test surface with session restore, credential-fragment cleanup, and
sign-out. Field UI depends on a provider-neutral `AuthModule`, while the
Supabase/Google adapter owns provider-specific details and test fakes cross the
same seam. The GitHub Pages Field build receives the required publishable
Supabase configuration. [google-oauth-setup.md](../apps/field/google-oauth-setup.md)
records the required non-secret configuration.

## Phase 28 — Workspace Vertical Slice (Field 0.28.0) ✅

Completed: scaffolded the draft `schemas/`, `@birdnerd/events`,
`@birdnerd/banding`, and `@birdnerd/sync-state` vertical slice; UUIDv7-backed
`workspace.created`, pending Workspace Membership, identity-linkage, and
idempotent activation events pass through local admission before projection.
Command-group events remain independently appendable and project correctly in
any arrival order. The separate local-only TypeScript Provisioner CLI emits the
initial Workspace and pending Admin/Contributor Workspace Memberships to draft
JSON Event Logs, never database rows or projections. Field 0.28.0 gates
operational UI on Workspace access and shows the full
sign-in/checking/no-access/active UX. The local JSON hand-off, handwritten
bindings, and in-memory store are explicitly temporary until the Phase 29
event core and Phase 30 Supabase exchange.
