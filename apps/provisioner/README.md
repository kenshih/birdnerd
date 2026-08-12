# BirdNerd Provisioner

The Provisioner is a separate, local-only admin CLI for the closed-pilot
Workspace bootstrap path. It is not part of the Field PWA.

```bash
npm run provision -- \
  --workspace-name "Cedar Creek" \
  --admin-email admin@example.com \
  --member contributor@example.com:contributor \
  --output ./birdnerd-provisioning-events.json
```

It emits a draft UUIDv7 Event Log containing `workspace.created` and pending
Membership events. Each event is admitted before the file is written; the CLI
never writes a projection or database row.

## Phase 28 limitation

The output file is a local test/harness hand-off only. It is not a formal Event
Bundle and cannot provision a deployed Field device. Phase 29 adds the durable
local event store and generated contracts; Phase 30 adds authenticated
Supabase admission and exchange.
