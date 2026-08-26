/**
 * Installs the Auth hook only in a CLI-local database already verified by its
 * caller. This is runtime bootstrap, not a Supabase migration: hosted schema
 * and Auth configuration stay unchanged.
 */
export async function installLocalEmailSignupGuard(database) {
  await database.query(`
    create table if not exists birdnerd_private.local_fixture_email_bootstrap (
      email text primary key
    );
    revoke all on table birdnerd_private.local_fixture_email_bootstrap from public, anon, authenticated;
    grant select, delete on table birdnerd_private.local_fixture_email_bootstrap to supabase_auth_admin;

    create or replace function birdnerd_private.birdnerd_reject_email_signup(event jsonb)
    returns jsonb
    language plpgsql
    security invoker
    set search_path = ''
    as $$
    declare
      authorized_email text;
    begin
      if event -> 'user' -> 'app_metadata' ->> 'provider' = 'email' then
        delete from birdnerd_private.local_fixture_email_bootstrap
        where email = lower(event -> 'user' ->> 'email')
        returning email into authorized_email;
        if authorized_email is not null then return '{}'::jsonb; end if;
        return jsonb_build_object(
          'error',
          jsonb_build_object(
            'http_code', 403,
            'message', 'Email/password registration is disabled locally. Use Google sign-in.'
          )
        );
      end if;

      return '{}'::jsonb;
    end;
    $$;

    grant usage on schema birdnerd_private to supabase_auth_admin;
    grant execute on function birdnerd_private.birdnerd_reject_email_signup(jsonb) to supabase_auth_admin;
    revoke all on function birdnerd_private.birdnerd_reject_email_signup(jsonb) from public, anon, authenticated;
  `)
}

/** Allows each declared fixture email through the local Auth hook exactly once. */
export async function authorizeLocalFixtureEmailBootstrap(database, members) {
  await database.query(
    `insert into birdnerd_private.local_fixture_email_bootstrap (email)
     select lower(email)
     from unnest($1::text[]) as email
     on conflict (email) do nothing`,
    [members.map(member => member.email)],
  )
}

/** Clears unused bootstrap authorizations if Auth did not consume them. */
export async function clearLocalFixtureEmailBootstrap(database, members) {
  await database.query(
    'delete from birdnerd_private.local_fixture_email_bootstrap where email = any($1::text[])',
    [members.map(member => member.email.toLowerCase())],
  )
}
