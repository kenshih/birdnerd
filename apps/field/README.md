# Field App

BirdNerd's production field PWA lives in this workspace.

Example data lives in `examples/`, including `birdnerd-full-sample.json`.

## Commands

Run from the repo root:

```bash
npm run dev
npm run dev:host
npm run build
npm run test
```

Run directly in this workspace:

```bash
npm --workspace @birdnerd/field run dev
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
