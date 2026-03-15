# Contributing to BirdNerd

## Development Setup

```bash
npm install
npm run dev          # start dev server at localhost:5173
npm run dev -- --host  # also expose on local network (for iPhone testing)
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run dev -- --host` | Expose on local network (iPhone testing) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint |

## iPhone / iPad Testing (Without Deploying)

1. Make sure your Mac and phone are on the same WiFi
2. Run `npm run dev -- --host`
3. Copy the `Network:` URL from the terminal output
4. Open it in Safari on your iPhone
5. To install as an app: Share → Add to Home Screen

## Code Organization

- `src/types/` — shared TypeScript interfaces (edit here first when adding fields)
- `src/data/` — species list and code tables (update species here, verify codes against IBP)
- `src/db/` — IndexedDB read/write functions
- `src/pages/` — top-level screen components
- `src/components/` — reusable UI components

## Adding a New Field

1. Add it to `BirdRecord` in `src/types/index.ts`
2. Add the input to `BirdRecordForm.tsx`
3. Add any code table to `src/data/codes.ts` if needed

## Deployment (GitHub Pages)

```bash
npm run build
# push dist/ to gh-pages branch, or configure GitHub Actions
```

Note: When deploying to a repo subdirectory (e.g. `username.github.io/birdnerd`), uncomment the `base` line in `vite.config.ts`.
