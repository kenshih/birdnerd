/**
 * Installs the Auth hook only in a CLI-local database already verified by its
 * caller. This is runtime bootstrap, not a Supabase migration: hosted schema
 * and Auth configuration stay unchanged.
 */
export async function installLocalEmailSignupGuard(database) {
  await database.query(`
    create or replace function birdnerd_private.birdnerd_reject_email_signup(event jsonb)
    returns jsonb
    language plpgsql
    security invoker
    set search_path = ''
    as $$
    begin
      if event -> 'user' -> 'app_metadata' ->> 'provider' = 'email' then
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
