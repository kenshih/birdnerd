# BirdNerd

https://kenshih.github.io/birdnerd/

A Progressive Web App for bird banders collecting field data, following protocols like MAPS/IBP.

Targets iPhone and iPad (installable as a home screen app), with Android support. Works fully offline.

This repository is an npm workspaces monorepo. The production field app lives in `apps/field/`, and the OCR companion PWA lives in `apps/ocr/`.

## Quick Start

### Prerequisites
- Node.js 22 LTS (or 23+)
- npm

### Local development

```bash
npm install
npm run dev
npm run dev:ocr
```

The dev server starts at `http://localhost:5173`.

**To test on your iPhone (same WiFi network):**
1. Run `npm run dev:host`
2. Your terminal will show a network URL like `http://192.168.x.x:5173`
3. Open that URL in Safari on your iPhone
4. Tap the Share button → "Add to Home Screen" to install as an app

### Build & preview production

```bash
npm run build
npm run build:ocr
npm run build:combined
npm run preview
npm run preview:ocr
npm run preview:combined
```

## Tech Stack

- React 19 + TypeScript
- Vite 7
- vite-plugin-pwa (offline, installable)
- React Hook Form
- IndexedDB via `idb` (local offline storage)
- GitHub Pages (static hosting)

## Workspace Structure

```
apps/
  field/        Production BirdNerd field PWA
  ocr/          OCR PWA workspace deployed at /birdnerd/ocr/
packages/
  shared/       Future shared domain package (scaffold only in Phase 21a)
docs/
  apps/         App-specific specs and notes
  repo/         Monorepo and deployment docs
  plan.md       Project plan and roadmap
  archives/     Previous plan versions
```

## Field App Structure

```
apps/field/
  src/          App source code
  public/       Static assets and seed data
  index.html    Vite entry HTML
  vite.config.ts
  vitest.config.ts
```

## Multi-App PWA Note

Both PWAs are deployed under the same GitHub Pages site:
- field app at `/birdnerd/`
- OCR app at `/birdnerd/ocr/`

Because the field app's service worker lives under `/birdnerd/`, it can otherwise intercept OCR navigations. The field app's Workbox navigation fallback must continue to denylist `/birdnerd/ocr/` so the OCR subtree remains independently loadable.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/plan.md](docs/plan.md) | Development roadmap, phase tracker, backlog |
| [docs/apps/field/product-specifications.md](docs/apps/field/product-specifications.md) | Field app product vision, entity overview, validation rules |
| [docs/apps/field/ux-specifications.md](docs/apps/field/ux-specifications.md) | Field app screens, layouts, wireframes, interaction patterns |
| [docs/apps/field/tech-specifications.md](docs/apps/field/tech-specifications.md) | Field app architecture, data model (full schema), code systems, deployment |
| [docs/apps/field/entities.md](docs/apps/field/entities.md) | Field app ER diagram, entity relationships |
| [docs/repo/monorepo.md](docs/repo/monorepo.md) | Workspace layout and monorepo conventions |
| [docs/repo/deployment.md](docs/repo/deployment.md) | GitHub Pages multi-app deployment and PWA notes |
| [apps/ocr/README.md](apps/ocr/README.md) | OCR workspace purpose, commands, and current status |

## See also

- [CONTRIBUTING.md](CONTRIBUTING.md) — development guidelines
- [apps/field/README.md](apps/field/README.md) — field workspace notes
- [apps/ocr/README.md](apps/ocr/README.md) — OCR workspace placeholder
- [packages/shared/README.md](packages/shared/README.md) — shared package placeholder
