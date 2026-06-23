# @birdnerd/sync-db

Isolated app for testing Supabase-backed sync, login, and data access ideas.

This is **not** part of the field PWA. It lives in the monorepo so it can share workspace tooling while the sync database direction is still experimental.

## Run locally

Create `apps/sync-db/.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
```

Then run:

```bash
npm run dev:sync-db
```

Open the printed local URL and use **Load first 5 rows** to confirm the browser client can read from `test_table`.

## Auth setup

In Supabase, enable email auth and configure redirects for local dev:

```text
Site URL: http://127.0.0.1:5173
Redirect URLs: http://127.0.0.1:5173/**
```

The app sends magic links with `emailRedirectTo: window.location.origin`, so the exact host in the browser should match the Supabase URL configuration.

Password reset uses the same local redirect. Click **Reset password**, send the reset email, open the link, and the app will switch to a **Set password** form.

For authenticated table reads, grant access to the `authenticated` role and protect rows with RLS:

```sql
alter table public.test_table enable row level security;

grant select on public.test_table to authenticated;

create policy "Authenticated users can read test rows"
on public.test_table
for select
to authenticated
using (auth.uid() is not null);
```

The app expects `test_table` to expose these fields:

```sql
id uuid
created_at timestamptz
readable_text varchar
```
