# Supabase schema workflow

The reviewed Phase 30–31 SQL migrations own the private Event Log, derived
Membership and entity-reference admission indexes, durable receipts, restricted
Provisioner Membership operations, and the authenticated browser exchange
RPCs. Terraform is not the schema manager.

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
`docs/apps/field/collaboration-pilot-runbook.md`. Never link or push to the shared
Workspace merely to test an unreviewed local migration.

For a reviewed migration, the schema-deployer first links this checkout to the
target project, then pushes the reviewed migration:

```bash
npx supabase link --project-ref ibowsjgtvkuiqqukcksr
npx supabase db push --linked
```

Confirm the project ref in the Supabase Dashboard before entering its database
password. The complete hosted verification and least-privilege instructions
remain in the pilot runbook.
