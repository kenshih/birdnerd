# Supabase schema workflow

Phase 30's reviewed SQL migration owns the private Event Log, derived
Membership admission index, durable receipts, restricted bootstrap operation,
and the three authenticated browser RPCs. Terraform is not the schema manager.

Local verification:

```bash
npm run check:event-bindings
npx supabase start
npx supabase db reset --local
npx supabase test db --local supabase/tests
npx supabase db lint --local --schema public,birdnerd_private --level warning
npx supabase db advisors --local
npx supabase stop
```

`check:event-bindings` verifies both the generated TypeScript bindings and the
SQL validator's Event catalog, exact-key lists, and full Contract fingerprint.
Any YAML Contract change therefore requires a reviewed validator update in the
versioned migration instead of silently drifting at the provider boundary.

Hosted application and Provisioner steps are in
`docs/apps/field/collaboration-pilot-runbook.md`. Never link or push to the pilot
project merely to test an unreviewed local migration.
