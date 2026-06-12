---
name: version-cut
description: Cut a BirdNerd version/release — bump the right workspace version, update shared-package consumer pins + lockfile, update CHANGELOG/plan/MEMORY, run the CI gate, commit, push, and confirm the deploy. Use when shipping a change, bumping a version, or completing a phase.
---

# Version cut — BirdNerd release lifecycle

BirdNerd is an npm-workspaces monorepo deployed to GitHub Pages on every push to
`main`. The deploy workflow gates on `npm ci` → `npm run lint` → `npm test` →
build. This skill is the checklist for cutting a version so the deploy stays green
and the docs stay in sync.

## Versioning scheme
- **Field app:** `0.PHASE.PATCH` — minor == the global phase number (e.g. `0.25.8`).
- **OCR / Shared / Sync-spike:** independent `0.MINOR.PATCH`, bumped on their own changes.
- A change can touch several workspaces; bump each one that changed.

## Steps

### 1. Bump the workspace `version`
Edit `version` in the changed workspace's `package.json`
(`apps/field`, `apps/ocr`, `packages/shared`, `apps/sync-spike`).

### 2. ⚠️ If you bumped `packages/shared`, fix every consumer + the lockfile
This is the trap that 404'd the deploy on 2026-06-12. `@birdnerd/shared` is
**private** and consumers pin it at an **exact version**. If the consumer pins
don't match the new shared version, `npm ci` can't satisfy them from the workspace
and falls back to the public registry → `npm error 404 '@birdnerd/shared@X' is not
in this registry`.

So after bumping `packages/shared/package.json`:
- Update the `"@birdnerd/shared": "X.Y.Z"` pin in **every** consumer. Find them all:
  ```bash
  grep -rn "birdnerd/shared" apps/*/package.json
  ```
  (currently `apps/field` and `apps/sync-spike`).
- Regenerate the lockfile: `npm install` (updates `package-lock.json` to the new
  shared version + any bumped workspace versions). Commit the lockfile.

### 3. Update `CHANGELOG.md`
Add an entry under `[Unreleased]` (Changed / Added / Fixed / Removed). Lead with the
workspace + version, e.g. `Field 0.25.8 — …`. Link any supporting research doc.

### 4. Run the CI gate locally BEFORE pushing
```bash
npm ci && npm run lint && npm test && npm run build
```
`npm run build` runs a clean `tsc -b` (the deploy's typecheck) — a bare incremental
`tsc -b` can miss errors, so trust the build, not a partial typecheck. Use `npm ci`
(not `npm install`) here to catch lockfile/pin mismatches the same way CI will.

### 5. On phase completion, sync the planning docs
- `docs/plan.md`: mark the sub-phase ✅, move completed detail into `docs/archives/plan.vN.md`,
  update the `**Now:**` line.
- `MEMORY.md` (auto-memory): update `Current Phase` + `Completed Phases`; drop goals that shipped.

### 6. CHANGELOG hygiene (when it gets long)
Keep `[Unreleased]` + recent entries in `CHANGELOG.md`; archive older dated sections to
`docs/archives/CHANGELOG.<period>.md` and link from the bottom of `CHANGELOG.md`.

### 7. Commit + push
```bash
git commit ...   # end body with the Co-Authored-By trailer
git push origin main
```
Push to `main` triggers the Pages deploy. (Branch first only if you don't intend to
ship directly — the project's normal workflow is direct-to-main.)

### 8. Confirm the deploy went green
```bash
gh run list --limit 3
```
If it failed on `npm ci` with a 404 for `@birdnerd/shared`, you missed step 2.

## Quick reference — files touched by a typical field+shared cut
- `packages/shared/package.json` (version)
- `apps/field/package.json` + `apps/sync-spike/package.json` (shared pin)
- `package-lock.json` (regen via `npm install`)
- `CHANGELOG.md`
- on phase end: `docs/plan.md`, `docs/archives/plan.vN.md`, `MEMORY.md`
