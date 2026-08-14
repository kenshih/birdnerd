# Phase 30 collaboration pilot runbook

Use this runbook only after PR review and merge/release approval. It separates
schema-deployer, restricted-Provisioner, browser configuration, and pilot
Member responsibilities so privileged credentials never reach Field.

## 1. Project baseline

1. Keep the Google OAuth app in Testing and add every pilot Member's exact
   Google email as a test user. Recheck
   [Google OAuth setup](google-oauth-setup.md).
2. In Supabase Auth, enable Google only. Disable email/password, magic-link,
   and anonymous sign-in.
3. Remove the experimental `test_table` and policy, or record the clean
   baseline before migration.
4. Confirm GitHub Actions variables `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` point to the pilot project. Never use a
   secret/service-role key in a `VITE_*` variable.

## 2. Apply and verify the schema

Use the schema-deployer credential, not the Provisioner credential:

```bash
npx supabase db push --linked
npx supabase db advisors --linked
```

Review the applied migration in `supabase/migrations`. Confirm:

- `birdnerd_private` is not in Data API exposed schemas;
- `anon` cannot execute the three public RPCs;
- `authenticated` can execute only claim, append, and pull;
- browser roles have no table DML or private-schema usage; and
- the security advisor has no unresolved Phase 30 finding.

## 3. Create the restricted Provisioner login

Create a distinct login in a trusted operator environment and keep its password
in the password manager:

```sql
create role birdnerd_phase30_operator login password '<managed-password>';
grant birdnerd_provisioner to birdnerd_phase30_operator;
```

The login must not receive table grants, `service_role`, or migration-deployer
privileges. Run the CLI once and preserve its JSON audit receipt:

```bash
export BIRDNERD_PROVISIONER_DATABASE_URL='postgresql://...'
npm run provision -- \
  --workspace-name "Cedar Creek" \
  --admin-email admin@example.com \
  --member member@example.com:contributor
```

## 4. Two-Station acceptance

Every participant first updates to the Phase 30 Field build. Use two Stations
and two to four exact-email Members:

1. Each Member signs in with Google. Expected: invited users claim access;
   an uninvited account sees no Workspace data.
2. Create a pilot Session and partial Banding Record online. Expected: the
   Event Pipeline traces local append, projection, queue, receipt, and cursor.
3. Put both Stations offline and create/amend different fields. Expected: saves
   remain available and status says changes stay on-device.
4. Assign the same physical band to two records. Expected: both records remain
   and a conflict is visible.
5. Reconnect both Stations and sync. Expected: Event logs converge and field
   values resolve by HLC then Event ID without silent loss.
6. Export a Workspace Event Bundle, make an additional offline edit, restore
   the older Bundle, and reconnect. Expected: the offline Event is protected,
   the replica rebuilds, and normal sync catches up.
7. Record participant/device/build, audit IDs, outcomes, advisor result, and
   any failure before expanding the Event catalog.

After Pages deploy, verify `/birdnerd/` and `/birdnerd/ocr/` work and
`/birdnerd/sync-db/` is absent. The `sync-db` experiment may be used only
locally against a different project.

## Pilot evidence

Status for PR review: **not run**. The hosted acceptance requires the reviewed
PR to be merged/released, operator-only Supabase credentials, and two to four
human Members on two real Stations; none are available to an implementation
session. Do not mark Phase 30 complete until the run above is performed and the
following evidence is replaced with observed values.

| Evidence | Observed value |
|---|---|
| Field build/version and deployment | Pending |
| Workspace/Provisioner audit command IDs | Pending |
| Members and Station/device identifiers | Pending |
| Online/offline convergence and HLC LWW | Pending |
| Physical-band conflict visibility | Pending |
| Event Bundle recovery with protected offline Event | Pending |
| Supabase advisor result | Pending |
| Failures/follow-ups | Pending |
