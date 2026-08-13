# BirdNerd Event Contracts

This directory is the portable source location for BirdNerd Event Contracts.
Phase 29 defines the version-1 Workspace-access payload catalog:

- `workspace.created`
- `membership.preauthorized`
- `user-account.linked`
- `membership.activated`

Phase 30 adds the operational pilot payload catalog:

- `session.created`
- `banding-record.created`
- `banding-record.fields-amended`

They use the intentionally restricted JSON Schema 2020-12 subset selected in
ADR 0008. `npm run generate:event-bindings` parses these YAML files and writes
the committed TypeScript bindings and runtime validator used by
`@birdnerd/events`; `npm run check:event-bindings` rejects generated-file
drift. The generator accepts only object, array, scalar, `enum`, `const`,
`oneOf`, `required`, `properties`, `items`, `minLength`, `minimum`, `maximum`,
`pattern`, `format`, and `additionalProperties` in this catalog. Add a generator test before
expanding that portable subset.

`event-envelope.v1.yaml` remains readable only for the historical
Workspace/access Event catalog; pilot Session and Banding Record types require
the v2 envelope. `event-envelope.v2.yaml` is current and adds the HLC tuple. Each other
`*.v1.yaml` is one payload contract, identified by its title before the
trailing ` v1` (for example, `workspace.created v1`). Event type and schema
version remain independent compatibility boundaries; current draft contracts
may change destructively only until the first shared-data release is frozen.
