# Google OAuth setup

**Status:** Hosted Google configuration is complete. Field 0.28.0 uses Google
OAuth as the first step of its Workspace access gate; Field 0.32.4 adds an
explicit local-only check using a separate Google client. Google authentication
alone does not grant BirdNerd access.

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

After a successful client-only OAuth callback, Supabase returns the temporary
session tokens in the URL fragment. Field 0.27.2 persists the session, then
removes that fragment from the browser URL.

Follow Supabase's current [Login with Google setup instructions](https://supabase.com/docs/guides/auth/social-login/auth-google) for the Dashboard flow. Its displayed callback URL and provider requirements take precedence if they change.

## Local Field OAuth (Field 0.32.4)

Local OAuth uses a **separate** Google Web client. It is not the hosted pilot
client and must not change the hosted Supabase project or its provider settings.

1. In Google Cloud, create or select the local test Web client and add:
   - Authorized JavaScript origin: `http://localhost:5173`
   - Authorized redirect URI:
     `http://127.0.0.1:54321/auth/v1/callback`
2. Keep the local client secret in the uncommitted project-root `.env` file:

   ```dotenv
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="local-web-client-id"
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET="local-web-client-secret"
   ```

   Both values are required together. Only `npm run dev:local-google` passes
   these names to its local Supabase CLI process; inherited Google credentials
   are ignored. Never use a `VITE_*` name, commit the values, or copy either
   local credential to the hosted project.
3. To exercise the real account against fixture data, first load the disposable
   fixture and keep its printed Workspace ID. This resets local fixture data:

   ```bash
   npm run fixtures:load -- operational-workspace
   ```

4. Pre-authorize the exact Google email with an explicit operational role:

   ```bash
   npm run fixtures:invite -- \
     --workspace-id <fixture-workspace-uuid> \
     --email person@example.com \
     --role admin
   ```

   This local-only command neither creates an Auth user nor resets data. It
   verifies the private marker written only after the Loader has replayed the
   declared fixture, then calls the existing restricted Provisioner invite
   operation; its JSON output is the audit receipt. Use `contributor` when
   testing only normal data entry.
5. Run `npm run dev:local-google`. The command first verifies the local stack's
   loopback API URL, then stops and starts only that stack so the committed
   local provider configuration can read `.env`; it preserves local volumes and
   does not reset data.
6. Select **Continue with Google** in Field and complete the Google redirect.
   Supabase may create or link a local Auth user on that first successful
   sign-in. A matching pre-authorized email activates the pending Membership
   through Field's normal initial-access claim and opens the fixture Workspace.
   Without an invitation it correctly ends at Field's normal no-access screen:
   no local BirdNerd Account or Workspace Membership is created or activated
   merely by signing in. Direct email, SMS, and anonymous signup remain disabled.

The local command exists to exercise the real Google/Supabase callback and
Field session handling. Fixture-member testing remains `npm run dev`; hosted
pilot and real-device testing remain `npm run dev:pilot` and never read these
local Google credentials. Starting ordinary `npm run dev` after the OAuth
check reloads the verified local stack without those credentials.

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
