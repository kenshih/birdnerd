# BirdNerd Provisioner

The Provisioner sets up a new BirdNerd Workspace for the closed pilot. An
administrator runs it once to create the Workspace and record the exact Google
email addresses that are allowed to use it, including the first Admin.

It is a separate, local-only CLI, not part of the Field PWA. Field users cannot
create Workspaces or grant themselves access.

```bash
npm run provision -- \
  --workspace-name "Cedar Creek" \
  --admin-email admin@example.com \
  --member contributor@example.com:contributor \
  --output ./birdnerd-provisioning-events.json
```

Under the hood, it emits a draft UUIDv7 Event Log containing
`workspace.created` and pending Workspace Membership events. Each event is
admitted before the file is written; the CLI never writes a projection or
database row.

## Phase 28 limitation

The output file is a local test/harness hand-off only. It is not a formal Event
Bundle and cannot provision a deployed Field device. Phase 29 adds the durable
local event store and generated contracts; Phase 30 adds authenticated
Supabase admission and exchange.
