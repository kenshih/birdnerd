# BirdNerd

PWA for bird banders to collect, manage, and export banding data. Offline-first, mobile-first (iPhone/iPad), Android supported.

## Key Docs

- [docs/plan.md](docs/plan.md) — current roadmap & phase tracker
- [CHANGELOG.md](CHANGELOG.md) — shipped changes and release history
- [docs/apps/field/product-specifications.md](docs/apps/field/product-specifications.md) — field app product spec, open decisions (§ 8)
- [docs/apps/field/tech-specifications.md](docs/apps/field/tech-specifications.md) — field app architecture, data model, code systems
- [docs/apps/field/ux-specifications.md](docs/apps/field/ux-specifications.md) — field app screens, wireframes, interaction patterns
- [docs/apps/field/ux-asset-system.md](docs/apps/field/ux-asset-system.md) — how UX contracts, local Storybook examples, and browser proof stay coherent
- [docs/apps/field/entities.md](docs/apps/field/entities.md) — field app ER diagram + data flow
- [docs/repo/monorepo.md](docs/repo/monorepo.md) — repo/workspace layout and responsibilities
- [docs/repo/deployment.md](docs/repo/deployment.md) — GitHub Pages multi-app deployment notes

## Primary Domain References (banding standards)

- [docs/resources/MAPSManual25.pdf](docs/resources/MAPSManual25.pdf) — MAPS Manual 2025 Protocol (IBP, ~100 pp.). **Authoritative** for all field definitions, code scales, and procedures. Code definitions on printed pp. 45–66. Long — use targeted page reads.
- [docs/resources/MAPS-Materials-MAPS-Banding-Codes-Summary-2026.pdf](docs/resources/MAPS-Materials-MAPS-Banding-Codes-Summary-2026.pdf) — MAPS Banding Codes 2026 (2-page cheat sheet). Quick lookup for all numeric scales + WRP. Aligns with 2025 manual; small gaps: Disposition F/R and Feather Pull X/C not listed.
- [docs/resources/bbl-bird-status-codes.md](docs/resources/bbl-bird-status-codes.md) — BBL Bander Portal status codes (https://www.pwrc.usgs.gov/BBL/Bander_Portal/login/birdstatus.php). Explains the single-digit + two-digit structure behind the three-digit MAPS codes (300, 301, 318 …). Use when a status code isn't in the MAPS cheat sheet or manual.
- [docs/resources/research-banding-codes-reconciliation.md](docs/resources/research-banding-codes-reconciliation.md) — Reconciliation: 2026 cheat sheet vs 2025 manual vs app code tables. Lists all discrepancies + suggested fixes.

## Stack

- React 19 + TypeScript + Vite 7
- vite-plugin-pwa (offline, installable)
- React Hook Form
- IndexedDB via `idb` (see `package.json` for version)
- GitHub Pages — client-side rendering only, no SSR ever

## Project Structure

```
apps/
  field/
    src/        — current field PWA source
    public/     — field app static assets + seed data
  ocr/          — OCR PWA workspace
packages/
  shared/       — shared domain package
docs/           — specs, plan, entities, archives
nogit/          — Hallie's source docs (not committed)
```

## Source of Truth (which doc to trust when they disagree)

- **`docs/plan.md`** — what's next and what's in progress (the phase marked **Current** in **Current roadmap**). Forward-looking only; maintain it using [roadmap-maintenance.md](docs/repo/roadmap-maintenance.md).
- **`CHANGELOG.md`** — what shipped.
- **`docs/apps/*/`* specs** — how things work (product/tech/ux/entities).
- **Heads-up:** `plan.md` phase-status markers (`**Current**` / completed archive rows) can lag actual state — Ken sometimes works off-session or skips the phase-end update. When a task is about what's next / versioning / roadmap, reconcile against `git log` + `package.json` first; flag mismatches rather than trusting the docs blindly.

## Conventions

- **All fields optional.** Partial records are valid. Soft warnings only, never block save.
- **Update specs when changing behavior.** Product spec, tech spec, ux spec, and plan should stay in sync.
- **Visible Field behavior:** Follow [the UX Asset System](docs/apps/field/ux-asset-system.md) so its contract, visual example, and browser proof remain coherent.
- **Update `CHANGELOG.md` for shipped user-visible, app-version, or repo-structure changes.**
- **Bundle schema versioning.** Bump `BUNDLE_VERSION` in `bundle-schema.ts` when adding/removing/renaming fields on bundled entities. Write a migration function.
- **IndexedDB versioning.** Bump version in `db/index.ts` upgrade handler when adding stores or indexes.
- **Event evolution.** Design the desired current Event behavior first, then follow [docs/agents/event-evolution.md](docs/agents/event-evolution.md) for the required historical compatibility, backfill/upcast, and prior-state replay pass.
- **Code tables** live in `apps/field/src/data/codes.ts`. Species list in `apps/field/src/data/species.ts`.
- **Pure validation functions** in `apps/field/src/utils/validation.ts` — no DB or React deps.
- **Tests** via vitest + fake-indexeddb. Run: `npm test`
- **On phase completion** (same moment as the version-bump step): follow [roadmap-maintenance.md](docs/repo/roadmap-maintenance.md).

## Commands

```bash
npm run dev               # starts/verifies local Supabase, then Field
npm run dev:host          # expose local Field server on LAN (Supabase remains loopback)
npm run dev:local-google  # explicit loopback-only local Google OAuth server
npm run dev:pilot         # explicit hosted-pilot Field server
npm run dev:pilot:host    # explicit hosted-pilot server accessible on LAN
npm run dev:ocr           # OCR app dev server
npm run build             # production build
npm run build:ocr         # OCR production build
npm run build:combined    # assemble Pages-style site output
npm run preview:host      # preview production build on LAN
npm run preview:ocr       # OCR preview
npm run preview:combined  # serve Pages-style combined site locally under /birdnerd/
npm test                  # run vitest
```

## Working Style

- Ask questions one by one, update plan docs iteratively
- Start simple, layer features incrementally
- When starting a dev/preview server for testing, stop any server process you started before ending the turn unless the user explicitly asks to leave it running. If left running, mention the URL and that it is still running.
- Maintain the roadmap, changelog, and plan archives using [roadmap-maintenance.md](docs/repo/roadmap-maintenance.md)

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

Multi-context domain documentation uses a root `CONTEXT-MAP.md`. See `docs/agents/domain.md`.
