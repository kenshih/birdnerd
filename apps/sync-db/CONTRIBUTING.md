# how this was set up

## in ghactions

These set. see 1 password for .env.local, though these are not secrets:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```
## in supabase

[BirdNerd-sync project](https://ibowsjgtvkuiqqukcksr.supabase.co)

```
grand select on public.test_table TO anon;
grant select on public.test_table to authenticated;

create policy "Enable read access for all users"
  on public.test_table
  for select
  to public
  using (true);

create policy "Authenticated users can read test rows"
    on public.test_table
    for select
    to authenticated
    using (auth.uid() is not null);  

# after testing i did this:
revoke select on public.test_table from anon;
drop policy if exists ""Enable read access for all users" on public.test_table;
```