# BirdNerd — Deployment Notes

BirdNerd deploys to a single GitHub Pages site with multiple app subpaths.

## Published Paths

- field app: `/birdnerd/`
- OCR app: `/birdnerd/ocr/`

## Build Assembly

GitHub Actions builds both published apps, then assembles one combined Pages
artifact:

- field `dist` copied to site root under `birdnerd/`
- OCR `dist` copied under `birdnerd/ocr/`

## Supabase Auth configuration

The Field build receives `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` from GitHub Actions variables. Vite embeds
these values at build time, so an absent variable produces a deployed app with
no Supabase configuration. These are publishable browser values; never place a
Supabase secret or `service_role` key in a `VITE_*` variable.

`apps/sync-db` remains an isolated local experiment. It is intentionally not
included by `build:combined`, CI production builds, or Pages, and is not
published at `/birdnerd/sync-db/`; do not point it at the Field pilot
Supabase project.

## PWA Constraint

Because both PWAs share the same GitHub Pages site, the field app's service worker scope overlaps the OCR subtree.

The field app must keep `/birdnerd/ocr/` in its Workbox navigation fallback denylist. Otherwise the field PWA can serve its own app shell for OCR routes.

## Local Preview

Use:

```bash
npm run preview:combined
```

Then verify:

- `http://localhost:4173/birdnerd/`
- `http://localhost:4173/birdnerd/ocr/`
