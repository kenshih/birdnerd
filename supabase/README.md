# Supabase schema workflow

Phase 30's reviewed SQL migration owns the private Event Log, derived
Membership admission index, durable receipts, restricted bootstrap operation,
and the three authenticated browser RPCs. Terraform is not the schema manager.

Local verification:

```bash
npx supabase start
npx supabase db reset --local
npx supabase test db --local supabase/tests
npx supabase db lint --local --schema public,birdnerd_private --level warning
npx supabase db advisors --local
npx supabase stop
```

Hosted application and Provisioner steps are in
`docs/apps/field/collaboration-pilot-runbook.md`. Never link or push to the pilot
project merely to test an unreviewed local migration.
