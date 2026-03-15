# BirdNerd

A Progressive Web App for bird banders collecting field data, following protocols like MAPS/IBP.

Targets iPhone and iPad (installable as a home screen app), with Android support. Works fully offline.

## Quick Start

### Prerequisites
- Node.js 22 LTS (or 23+)
- npm

### Local development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

**To test on your iPhone (same WiFi network):**
1. Run `npm run dev -- --host`
2. Your terminal will show a network URL like `http://192.168.x.x:5173`
3. Open that URL in Safari on your iPhone
4. Tap the Share button → "Add to Home Screen" to install as an app

### Build & preview production

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite 7
- vite-plugin-pwa (offline, installable)
- React Hook Form
- IndexedDB via `idb` (local offline storage)
- GitHub Pages (static hosting)

## Project Structure

```
src/
  components/   UI components (e.g. SpeciesAutocomplete)
  data/         Species list, banding code tables
  db/           IndexedDB layer
  hooks/        Custom React hooks
  pages/        Top-level views (SessionList, SessionView, BirdRecordForm)
  types/        TypeScript types
docs/
  plan.md                     Project plan and roadmap
  banding.log.book.page.JPG   Reference banding sheet
```

## See also

- [docs/plan.md](docs/plan.md) — full project plan and roadmap
- [CONTRIBUTING.md](CONTRIBUTING.md) — development guidelines
