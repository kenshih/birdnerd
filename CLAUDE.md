# BirdNerd

PWA for bird banders to collect, manage, and export banding data. Offline-first, mobile-first (iPhone/iPad), Android supported.

## Key Docs

- [docs/plan.md](docs/plan.md) — current roadmap & phase tracker
- [CHANGELOG.md](CHANGELOG.md) — shipped changes and release history
- [docs/apps/field/product-specifications.md](docs/apps/field/product-specifications.md) — field app product spec, open decisions (§ 8)
- [docs/apps/field/tech-specifications.md](docs/apps/field/tech-specifications.md) — field app architecture, data model, code systems
- [docs/apps/field/ux-specifications.md](docs/apps/field/ux-specifications.md) — field app screens, wireframes, interaction patterns
- [docs/apps/field/entities.md](docs/apps/field/entities.md) — field app ER diagram + data flow
- [docs/repo/monorepo.md](docs/repo/monorepo.md) — repo/workspace layout and responsibilities
- [docs/repo/deployment.md](docs/repo/deployment.md) — GitHub Pages multi-app deployment notes

## Stack

- React 19 + TypeScript + Vite 7
- vite-plugin-pwa (offline, installable)
- React Hook Form
- IndexedDB via `idb` (currently v7)
- GitHub Pages — client-side rendering only, no SSR ever

## Project Structure

```
apps/
  field/
    src/        — current field PWA source
    public/     — field app static assets + seed data
  ocr/          — OCR PWA workspace
packages/
  shared/       — future shared domain package
docs/           — specs, plan, entities, archives
nogit/          — Hallie's source docs (not committed)
```

## Conventions

- **All fields optional.** Partial records are valid. Soft warnings only, never block save.
- **Update specs when changing behavior.** Product spec, tech spec, ux spec, and plan should stay in sync.
- **Update `CHANGELOG.md` for shipped user-visible, app-version, or repo-structure changes.**
- **Bundle schema versioning.** Bump `BUNDLE_VERSION` in `bundle-schema.ts` when adding/removing/renaming fields on bundled entities. Write a migration function.
- **IndexedDB versioning.** Bump version in `db/index.ts` upgrade handler when adding stores or indexes.
- **Code tables** live in `apps/field/src/data/codes.ts`. Species list in `apps/field/src/data/species.ts`.
- **Pure validation functions** in `apps/field/src/utils/validation.ts` — no DB or React deps.
- **Tests** via vitest + fake-indexeddb. Run: `npm test`

## Commands

```bash
npm run dev               # local dev server
npm run dev:host          # dev server accessible on LAN
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
- Keep `plan.md` forward-looking and `CHANGELOG.md` focused on shipped changes
- Archive completed plan versions in `docs/archives/`
