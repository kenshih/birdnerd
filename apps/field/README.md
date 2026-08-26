# Field App

BirdNerd's production field PWA lives in this workspace.

Example data lives in `examples/`, including `birdnerd-full-sample.json`.

## Commands

Run from the repo root:

```bash
npm run dev
npm run dev:host
npm run dev:local-google
npm run dev:pilot
npm run dev:pilot:host
npm run build
npm run test
```

`npm run dev` is the safe, local-first workflow. It requires Docker Desktop
(or another Docker-compatible runtime), starts or verifies the local Supabase
CLI stack, and overrides any hosted Vite settings with the stack's verified
loopback API URL and current publishable key. It does not reset data. After
`npm run fixtures:load -- operational-workspace`, the signed-out screen offers
**Continue as Fixture Admin** and **Continue as Fixture Contributor**. Use
separate browser profiles to test the two Members concurrently; these buttons
create real local email/password sessions and retain the fixture's synthetic
Google identity for the normal Workspace claim and sync path.

`npm run dev:local-google` is the separate local Google OAuth check. It
restarts only the verified CLI-local Supabase stack so the Google provider can
read the uncommitted root `.env` test-client credentials, then starts Field
against the same loopback endpoint. It never resets local data or manages the
hosted pilot. Both root `.env` credentials are required; ambient credentials
are ignored. See [Google OAuth setup](../../docs/apps/field/google-oauth-setup.md)
for the required distinct Google client and callback URL. To give a real Google
account access to the current disposable fixture, first run
`npm run fixtures:invite -- --workspace-id <fixture-workspace-uuid> --email person@example.com --role admin`
with the Workspace ID reported by `npm run fixtures:load -- operational-workspace`.

Hosted pilot testing is opt-in: create the uncommitted
`apps/field/.env.pilot.local` file containing only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then run
`npm run dev:pilot`. The command rejects loopback or non-HTTPS targets and
never starts, resets, or links Supabase. Use `npm run dev:pilot:host` for a
real-device hosted-pilot test; a local Supabase URL cannot be used by another
device via `npm run dev:host`.

Run directly in this workspace:

```bash
npm --workspace @birdnerd/field run dev
npm --workspace @birdnerd/field run dev:local-google
npm --workspace @birdnerd/field run dev:pilot
npm --workspace @birdnerd/field run build
npm --workspace @birdnerd/field run test
```

## Playwright access fixture

The browser suite starts its own Vite development server with
`VITE_E2E_ACCESS=true`. That enables an in-memory, pre-authorized Workspace
Admin fixture so existing operational-flow tests can reach the Field home
screen after Phase 28's access gate.

You do not need—and must not add—`VITE_E2E_ACCESS` to `.env.local`. It is set
only by `playwright.config.ts`, and `import.meta.env.DEV` prevents the fixture
from activating in a production build.

Before running `npm run test:e2e`, stop any normal Field dev server on port
5173 so Playwright can start its fixture-enabled server. The E2E command never
reuses a normal dev server because it lacks the test-only access fixture; if
the port is busy, it now fails immediately instead of timing out.

```bash
npm run kill:dev
```
