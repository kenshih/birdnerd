# Operational Workspace authority separates configuration from field work

**Status:** accepted
**Date:** 2026-08-20
**Decided in:** Phase 31 delivery planning

## Context

Phase 30 established Workspace Membership roles, but its pilot described
physical-band collisions as visible for "Admin correction." The operational
Field cutover needs a clearer distinction: field crews must not wait for an
Admin to correct inventory or data-entry mistakes, while Workspace access and
configuration remain controlled.

## Decision

- **Contributor** is the normal operational role. An active Contributor may
  create, amend, deactivate, and explicitly reactivate operational data;
  receive and manage inventory; resolve visible band-allocation conflicts; and
  run a reviewed historical CSV import after required configuration exists.
- **Admin** is a strict superset of Contributor. Admin-only responsibilities
  are Workspace Membership/access administration and configuration of Stations,
  Nets, and the Bander roster.
- A conflict correction is always a later immutable corrective Event. It never
  rewrites or deletes either original allocation fact.
- An Admin may explicitly link a User Account to one roster Person. Field
  pre-fills the Bander control only when that linked Person has an active Bander
  entry; it never infers the link from a display name or email, and the user may
  select another Bander for a record.

## Consequences

- Phase 31 domain commands and projections enforce this authority model;
  Supabase remains responsible only for authenticated Membership admission and
  does not become the business authorization model.
- The Phase 30 phrase "Admin correction" means that a conflict is visible to
  an Admin, not that an Admin is required to resolve it. Future specifications
  and UI use the authority rules above.
- Workspace configuration and field operations are auditable through the
  Event Log, including deactivation and explicit reactivation.
