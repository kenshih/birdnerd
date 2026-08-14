# BirdNerd Provisioner

The Provisioner is a deploy-only trusted-operator adapter for bootstrapping the
closed collaboration pilot. It connects directly to Postgres using a distinct
login that inherits only the non-login `birdnerd_provisioner` role. That role
can execute `birdnerd_private.bootstrap_workspace` and has no raw Event Log or
Membership DML privileges.

After the reviewed Supabase migration is applied, create a separate login in a
trusted operator environment and grant it the role:

```sql
create role birdnerd_pilot_bootstrap login password '<password-managed-outside-git>';
grant birdnerd_provisioner to birdnerd_pilot_bootstrap;
```

Run once for the pilot Workspace:

```bash
# Download the SSL certificate from Supabase Dashboard > Project Settings > Database.
# Keep this file outside the repository and use the direct database host.
export BIRDNERD_PROVISIONER_DATABASE_URL='postgresql://birdnerd_pilot_bootstrap:<password>@db.ibowsjgtvkuiqqukcksr.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=/private/tmp/birdnerd-pilot/prod-supabase.cer'
npm run provision -- \
  --workspace-name "Cedar Creek" \
  --admin-email admin@example.com \
  --member person@example.com:contributor
```

The JSON output is the operator audit receipt: Workspace/command IDs, canonical
bootstrap Events, and Member count. Preserve it with the pilot notes. Never put
the database URL in a `VITE_*` variable, Field device, browser, repository, or
GitHub Pages configuration. The Provisioner does not create Supabase Auth users;
each exact-email Member activates on first Google sign-in. Keep TLS certificate
verification enabled: the `sslrootcert` path lets `pg` verify Supabase's server
certificate, rather than accepting any certificate.
