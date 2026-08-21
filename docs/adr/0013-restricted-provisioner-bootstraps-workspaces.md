# A restricted provisioner bootstraps the first workspace and Admin

The first end-to-end event slice will create a Workspace and its initial Admin
Membership through a separate, local-only admin Provisioner CLI app rather
than the Field PWA. Phase 28 selects TypeScript so the CLI exercises the same
draft event contracts and admission path as Field; reconsider another language
only after Phase 29 makes the portable contract-generation boundary real. The
Provisioner emits the same canonical events and uses the ordinary admission
and projection path, so bootstrap authority does not require privileged direct
projection or database writes. It will also pre-authorize pending Memberships
for the closed pilot; the Field PWA has no workspace-creation or join flow.

[ADR 0018](0018-phase-31-operational-event-catalog.md) extends the same
least-privilege operator boundary with post-bootstrap Membership invite,
role-change, deactivation, and reactivation commands; it does not broaden the
Provisioner to raw table access.
