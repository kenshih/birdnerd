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
# One-time link for this checkout. Confirm this is the pilot-project ref in
# the Supabase Dashboard before entering the database password locally.
npx supabase link --project-ref ibowsjgtvkuiqqukcksr
npx supabase db push --linked
npx supabase db advisors --linked
```

`supabase db push --linked` requires a linked project. If it reports
`Cannot find project ref`, run the `supabase link` command above first; it
stores the link locally and does not apply a migration by itself. Never put the
database password, a connection string, a service-role key, or any credential
in the repository or a `VITE_*` variable.

Review the applied migration in `supabase/migrations`. Confirm:

- `birdnerd_private` is not in Data API exposed schemas;
- `anon` cannot execute the three public RPCs;
- `authenticated` can execute only claim, append, and pull;
- browser roles have no table DML or private-schema usage; and
- the security advisor has no unresolved Phase 30 finding.

The advisor is expected to warn that authenticated users can execute
`public.birdnerd_claim_initial_access`, `public.birdnerd_append_events`, and
`public.birdnerd_pull_events` as `SECURITY DEFINER` functions. They are the
three deliberate, authenticated RPC boundary functions: each has a fixed safe
search path, revokes `PUBLIC`/`anon` execution, and checks the caller and
active Membership before private-schema access. Verify the warning names are
exactly those three functions and that `anon` has no execute grant.

Treat a warning for `public.rls_auto_enable`, its `ensure_rls` event trigger,
or `public.test_table` as an unresolved experimental baseline. Remove all
three before the pilot; do not use a broad `CASCADE`:

```sql
drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();
drop table if exists public.test_table;
```

Leaked-password protection is not a Phase 30 blocker only while password
sign-in remains disabled; enable it if password authentication is ever enabled.

## 3. Create the restricted Provisioner login

Create a distinct login in a trusted operator environment and keep its password
in the password manager:

```sql
create role birdnerd_pilot_bootstrap login password '<managed-password>';
grant birdnerd_provisioner to birdnerd_pilot_bootstrap;
```

The login must not receive table grants, `service_role`, or migration-deployer
privileges. In the Supabase Dashboard, open **Project Settings → Database**,
download the SSL certificate, and save it outside the repository (for example,
`/private/tmp/birdnerd-pilot/prod-supabase.cer`). The Provisioner uses the
direct `db.<project-ref>.supabase.co:5432` host and verifies that certificate;
do not turn verification off. Run the CLI once and preserve its JSON audit
receipt:

```bash
export BIRDNERD_PROVISIONER_DATABASE_URL='postgresql://birdnerd_pilot_bootstrap:<password>@db.ibowsjgtvkuiqqukcksr.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=/private/tmp/birdnerd-pilot/prod-supabase.cer'
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

Status: **passed on 2026-08-13**. The hosted acceptance used the deployed
Field 0.30.0 slice plus the Field 0.30.1 linked-Google-identity hotfix, one
Admin, one Contributor, and two real Stations. Operator-only credentials
remained outside Field and the repository.

| Evidence | Observed value |
|---|---|
| Field build/version and deployment | Field 0.30.0 deployed from PR #13; Field 0.30.1 deployed as the linked-Google-identity pilot hotfix (Pages workflow run `31766473959`). |
| Workspace/Provisioner audit command IDs | Workspace `019ffdd7-d09f-7c41-8990-602d5fffa3b0`; command `019ffdd7-d0a9-79b5-8f2d-8f2b0f516763`. |
| Members and Station/device identifiers | One preauthorized Admin and one Contributor claimed access and used two real Stations. Personal/device identifiers remain in the operator record, not Git. |
| Online/offline convergence and HLC LWW | Both Stations received the online baseline. Offline amendment and creation work converged after reconnect. |
| Physical-band conflict visibility | Both Stations retained and showed the collision for physical band `9999-00003`; no record was silently lost. |
| Event Bundle recovery with protected offline Event | After an older Bundle restore, the UI protected offline Event `9999-00004` (`BEWR`); reconnect/catch-up restored it on both Stations. |
| Supabase advisor result | Only the three intended authenticated `SECURITY DEFINER` RPC warnings remained; experimental `rls_auto_enable`/`ensure_rls`/`test_table` baseline removed. Leaked-password protection is nonblocking while password authentication stays disabled. |
| Failures/follow-ups | Field 0.30.1 fixed linked Google identities whose historical Supabase default provider was `email`, allowing the normal claim to run. |
