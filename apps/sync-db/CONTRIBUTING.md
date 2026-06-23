# how this was set up

```
GRANT SELECT ON public.test_table TO anon;

create policy "Enable read access for all users"
  on public.test_table
  for select
  to public
  using (true);
```