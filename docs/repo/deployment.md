# BirdNerd — Deployment Notes

BirdNerd deploys to a single GitHub Pages site with multiple app subpaths.

## Published Paths

- field app: `/birdnerd/`
- OCR app: `/birdnerd/ocr/`

## Build Assembly

GitHub Actions builds both apps, then assembles one combined Pages artifact:

- field `dist` copied to site root under `birdnerd/`
- OCR `dist` copied under `birdnerd/ocr/`

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
