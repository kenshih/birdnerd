# BirdNerd Event Contracts

This directory is the portable source location for BirdNerd Event Contracts.
Phase 28 introduces only the four draft Workspace-access contracts needed for
the local provisioning vertical slice:

- `workspace.created`
- `membership.preauthorized`
- `user-account.linked`
- `membership.activated`

They use the intentionally restricted JSON Schema 2020-12 subset selected in
ADR 0008. The TypeScript implementation in `@birdnerd/events` is handwritten
for this slice; Phase 29 will generate types and validators from these files
and add CI drift protection. Draft contracts may change destructively until the
first shared-data release is locked.
