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

The app expects `test_table` to expose these fields:

```sql
id uuid
created_at timestamptz
readable_text varchar
```
