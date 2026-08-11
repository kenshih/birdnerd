# Google OAuth setup

**Status:** Google Cloud prerequisites configured; Supabase provider configuration
and Field implementation remain part of Phase 27.

This note records the non-secret configuration for BirdNerd's Google-only login
surface. The governing product decision is [ADR 0007](../../adr/0007-google-oauth-initial-login.md).

## Google Cloud project

- Project name: `bird1`
- Audience: External, Testing
- Test users: `wa.wa.boo.do.2@gmail.com`
- Data-access scopes: `openid`, `userinfo.email`, and `userinfo.profile` only
- No Google APIs were enabled and no billing account was linked.

## OAuth web client

The Web application OAuth client permits these authorized JavaScript origins:

- `https://kenshih.github.io`
- `http://localhost:5173`

Its authorized redirect URI is:

- `https://ibowsjgtvkuiqqukcksr.supabase.co/auth/v1/callback`

The Google client ID and client secret are deliberately not recorded here. Keep
the secret in the Supabase Dashboard and a password manager only; never commit
it or put it in a browser-visible `VITE_*` variable.

## Supabase Dashboard configuration (required before a sign-in test)

1. Open **Authentication → Providers → Google** in the Supabase project.
2. Enable the Google provider.
3. Paste the Google OAuth client ID and client secret from project `bird1`.
4. Open **Authentication → URL Configuration** and set:
   - **Site URL:** `https://kenshih.github.io/birdnerd/`
  - **Additional Redirect URLs:**
    - `http://localhost:5173/birdnerd/`
     - `https://kenshih.github.io/birdnerd/`

The client secret stays in Supabase and the password manager only. It must not
be added to a committed `.env` file or a browser-visible `VITE_*` variable.

Follow Supabase's current [Login with Google setup instructions](https://supabase.com/docs/guides/auth/social-login/auth-google) for the Dashboard flow. Its displayed callback URL and provider requirements take precedence if they change.

## Later Phase 27 release guardrails

- Keep the Google Cloud app in Testing and add each pilot member's exact Google
  email as a test user before inviting them.
- Before releasing the Google-only login surface, disable any enabled
  non-Google Supabase authentication providers and anonymous sign-in.
- Do not create database tables, RLS policies, Workspaces, or Memberships as
  part of this setup; those are addressed by the later collaboration phases.

## Cost guardrail

This configuration uses basic Google identity scopes only. Do not attach Google
Cloud billing, start a free trial, or enable Google APIs solely for this login
flow. Doing so is unnecessary for the current closed pilot.
