# Supabase schema workflow

## Routine Field development

From the repository root, use `npm run dev`. It owns the safe local path:
the pinned project-local Supabase CLI starts or verifies the Docker stack,
`status --output env` supplies the browser's current local endpoint/key, and
the launcher refuses a non-loopback endpoint before Vite starts. It does not
run `db reset`, `link`, or any hosted command. See the root README for the
separate explicit `npm run dev:pilot` path.

The reviewed Phase 30–31 SQL migrations own the private Event Log, derived
Membership and entity-reference admission indexes, durable receipts, restricted
Provisioner Membership operations, and the authenticated browser exchange
RPCs. Terraform is not the schema manager.

Local verification:

```bash
npm run check:event-bindings
npx supabase start
npx supabase db reset --local
npm run test:phase31-migration
npx supabase test db --local supabase/tests
npx supabase db lint --local --schema public,birdnerd_private --level warning
npx supabase db advisors --local
npx supabase stop
```

`check:event-bindings` verifies both the generated TypeScript bindings and the
SQL validator's Event catalog, exact-key lists, and full Contract fingerprint.
Any YAML Contract change therefore requires a reviewed validator update in the
versioned migration instead of silently drifting at the provider boundary.

`npm run test:phase31-migration` is a local-only transactional replay of the
actual Phase 30, Phase 31, and Phase 31 compatibility-patch SQL files. The
Supabase pgTAP runner mounts test files into its database container but not the
checkout's migration directory, so this harness reads the authoritative local
files directly, rolls all schema/data changes back, and proves the patch
migration itself backfills historical Events before a dependent append. It
uses only the local Supabase database defaults; set standard `PG*` variables
to override them for a non-default local setup.

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

## getting a psql session to local supabase

assuming you've started supabase locally with the above npx commands...

```
docker exec -it supabase_db_birdnerd psql -U postgres -d postgres
```

## some useful commands in psql

```sql
\x auto
\dn
\df+ public.birdnerd_append_events
\sf public.birdnerd_append_events

select pg_get_functiondef(
  'public.birdnerd_append_events(jsonb)'::regprocedure
);
```
