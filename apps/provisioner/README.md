# BirdNerd Provisioner

The Provisioner is a trusted-operator adapter for bootstrapping a Workspace and
administering its Memberships outside Field. It connects directly to Postgres
using a distinct login that inherits only the non-login
`birdnerd_provisioner` role. That role can execute the narrow private bootstrap
and Membership lifecycle functions, but has no raw Event Log or Membership DML
privileges.

After the reviewed Supabase migration is applied, create a separate login in a
trusted operator environment and grant it the role:

```sql
create role birdnerd_pilot_bootstrap login password '<password-managed-outside-git>';
grant birdnerd_provisioner to birdnerd_pilot_bootstrap;
```

Bootstrap a Workspace once, then use the lifecycle commands when connectivity
and the trusted operator environment are available:

```bash
# Download the SSL certificate from Supabase Dashboard > Project Settings > Database.
# Keep this file outside the repository and use the direct database host.
export BIRDNERD_PROVISIONER_DATABASE_URL='postgresql://birdnerd_pilot_bootstrap:<password>@db.ibowsjgtvkuiqqukcksr.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=/private/tmp/birdnerd-pilot/prod-supabase.cer'
npm run provision -- \
  bootstrap --workspace-name "Cedar Creek" \
  --admin-email admin@example.com \
  --member person@example.com:contributor
```

```bash
npm run provision -- invite --workspace-id <workspace-uuid> --email person@example.com --role contributor
npm run provision -- set-role --workspace-id <workspace-uuid> --membership-id <membership-uuid> --role admin
npm run provision -- deactivate --workspace-id <workspace-uuid> --membership-id <membership-uuid>
npm run provision -- reactivate --workspace-id <workspace-uuid> --membership-id <membership-uuid>
```

The JSON output is the operator audit receipt: Workspace/command IDs, canonical
bootstrap or lifecycle Events, and Member count. Preserve it with the operator
notes. A repeated exact invite returns the existing Membership receipt without
adding a duplicate Event. Never put
the database URL in a `VITE_*` variable, Field device, browser, repository, or
GitHub Pages configuration. The Provisioner does not create Supabase Auth users;
each exact-email Member activates on first Google sign-in. Keep TLS certificate
verification enabled: the `sslrootcert` path lets `pg` verify Supabase's server
certificate, rather than accepting any certificate.
