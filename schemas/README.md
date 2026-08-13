# BirdNerd Event Contracts

This directory is the portable source location for BirdNerd Event Contracts.
Phase 29 defines the version-1 Workspace-access contract catalog:

- `workspace.created`
- `membership.preauthorized`
- `user-account.linked`
- `membership.activated`

They use the intentionally restricted JSON Schema 2020-12 subset selected in
ADR 0008. `npm run generate:event-bindings` parses these YAML files and writes
the committed TypeScript bindings and runtime validator used by
`@birdnerd/events`; `npm run check:event-bindings` rejects generated-file
drift. The generator accepts only object, array, scalar, `enum`, `const`,
`oneOf`, `required`, `properties`, `items`, `minLength`, `pattern`, `format`,
and `additionalProperties` in this catalog. Add a generator test before
expanding that portable subset.

`event-envelope.v1.yaml` describes fields shared by every event. Each other
`*.v1.yaml` is one payload contract, identified by its title before the
trailing ` v1` (for example, `workspace.created v1`). Event type and schema
version remain independent compatibility boundaries; current draft contracts
may change destructively only until the first shared-data release is frozen.
