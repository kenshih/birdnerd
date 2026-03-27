# BirdNerd

PWA for bird banders to collect, manage, and export banding data. Offline-first, mobile-first (iPhone/iPad), Android supported.

## Key Docs

- [docs/plan.v4.md](docs/plan.v4.md) — current roadmap & phase tracker
- [docs/product-specifications.md](docs/product-specifications.md) — product spec, open decisions (§ 8)
- [docs/tech-specifications.md](docs/tech-specifications.md) — architecture, data model, code systems
- [docs/ux-specifications.md](docs/ux-specifications.md) — screens, wireframes, interaction patterns
- [docs/entities.md](docs/entities.md) — ER diagram + data flow

## Stack

- React 19 + TypeScript + Vite 7
- vite-plugin-pwa (offline, installable)
- React Hook Form
- IndexedDB via `idb` (currently v7)
- GitHub Pages — client-side rendering only, no SSR ever

## Project Structure

```
src/
  pages/        — top-level screens (HomeScreen, SessionView, BirdRecordForm, BandInventory, etc.)
  components/   — reusable UI (SearchableSelect, BandSearchSelect, Collapsible, PageHeader, etc.)
  data/         — code tables (codes.ts, species.ts), seed.json, bundle-schema.ts
  db/           — IndexedDB setup, CRUD, migrations (index.ts)
  types/        — TypeScript interfaces (index.ts)
  utils/        — validation, CSV export/import, data bundle export/import
  test/         — vitest tests
docs/           — specs, plan, entities, archives
public/data/    — seed.json, example-data.json (Hallie's sample data)
nogit/          — Hallie's source docs (not committed)
```

## Conventions

- **All fields optional.** Partial records are valid. Soft warnings only, never block save.
- **Update specs when changing behavior.** Product spec, tech spec, ux spec, and plan should stay in sync.
- **Bundle schema versioning.** Bump `BUNDLE_VERSION` in `bundle-schema.ts` when adding/removing/renaming fields on bundled entities. Write a migration function.
- **IndexedDB versioning.** Bump version in `db/index.ts` upgrade handler when adding stores or indexes.
- **Code tables** live in `src/data/codes.ts`. Species list in `src/data/species.ts`.
- **Pure validation functions** in `src/utils/validation.ts` — no DB or React deps.
- **Tests** via vitest + fake-indexeddb. Run: `npm test`

## Commands

```bash
npm run dev               # local dev server
npm run dev -- --host     # dev server accessible on LAN (iPhone testing)
npm run build             # production build
npm run preview -- --host # preview production build on LAN
npm test                  # run vitest
npm run deploy            # build + deploy to GitHub Pages
```

## Working Style

- Ask questions one by one, update plan docs iteratively
- Start simple, layer features incrementally
- Keep plan.v4.md updated as phases complete
- Archive completed plan versions in `docs/archives/`
