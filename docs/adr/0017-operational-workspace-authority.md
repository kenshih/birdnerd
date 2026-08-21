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
- Membership administration remains outside the Field PWA in Phase 31. A
  trusted operator uses narrow Provisioner CLI commands to invite, change role,
  deactivate, or reactivate a Membership on behalf of the administrative
  process. Admins do not receive a Field membership-management screen.
- A conflict correction is always a later immutable corrective Event. It never
  rewrites or deletes either original allocation fact.
- An Admin may explicitly link a User Account to one roster Person. Field
  pre-fills the Bander control only when that linked Person has an active Bander
  entry; it never infers the link from a display name or email, and the user may
  select another Bander for a record.

## Consequences

- Phase 31 domain commands enforce this authority model for immediate offline
  feedback. Supabase Event Admission independently enforces a static
  Event-type-to-minimum-role table because the browser is not trusted, but it
  does not run operational projections or reconcile business state. Membership
  lifecycle Events are server-constructed through the trusted operator path.
- The Phase 30 phrase "Admin correction" means that a conflict is visible to
  an Admin, not that an Admin is required to resolve it. Future specifications
  and UI use the authority rules above.
- Workspace configuration and field operations are auditable through the
  Event Log, including deactivation and explicit reactivation.
- The detailed Event Catalog, admission index, and trusted-operator boundary
  are recorded in
  [ADR 0018](0018-operational-event-catalog.md).
