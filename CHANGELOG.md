# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adapted for BirdNerd's multi-app monorepo.

## [Unreleased]

### Added

- Shared 0.2.5 — **Domain lexicon.** `packages/shared/src/lexicon.ts` exports `LexiconEntry` (type), `LexiconCategory` (union), and `LEXICON` (38 entries). Covers feather tracts (P Covs, S Covs/G Covs, Alula, PP, SS, Tert, Rec), molt concepts (WRP, molt limits, body molt, FF/TF molt, FF wear, juv body plumage), age/sex (HY–ATY, Local), condition (skull, BP, CP, fat, feather pull), capture codes, protocol (MAPS, IBP, BBL, MAPS period), morphometrics, and band terminology. Pure data — no logic, no UI wiring. TypeScript now; YAML migration is a future portability step. Directly resolves the S covs/G covs terminology question: the `Secondary Coverts` entry documents that "S covs" and "G covs" are synonyms in banding usage (both = greater secondary coverts).

### Changed

- Field 0.25.9 — **Bird status codes + remarks rule** ([gh #1](https://github.com/kenshih/birdnerd/issues/1)). `BIRD_STATUS_CODES` trimmed to Hallie's authoritative list (`300 / 301 / 318 / 319 / 500 / 700 / ---`; speculative `333 / 334 / 380` removed). The Status field now offers an **"Other (write-in)"** option (free-text code for anything off-list) and its empty option reads **(empty)** to signal an intentional blank (the default — correct for band-fate/unbanded rows). Validation now **requires remarks (Notes) for any status other than blank or `300`** — covering 318/319/500/700, mortality (`---`), and write-ins — replacing the old per-code (500/`---`/OT) note rules. The Status-500→Disposition-required rule is unchanged. See [research-banding-codes-reconciliation.md](docs/resources/research-banding-codes-reconciliation.md).
- Shared/Field 0.25.8 — **Lost/destroyed-band records.** Master-sheet `BAND DESTROYED` / `BAND LOST` rows no longer vanish on import: they now create a `BirdRecord` (alongside the band) marked with the MAPS IBP capture code `D` (destroyed) / `L` (lost). New `D`/`L` values added to `CAPTURE_STATUS_CODES` (shared 0.2.4); they count as neither new bandings nor recaptures (per the MAPS "omit lost and destroyed bands" rule), so they're excluded from the BBL new-banding and recapture uploads but appear in the IBP master export. The fate is keyed to the IBP letter, **not** the BBL `4`/`8` (which already mean recapture here). The IBP export round-trips these back to `Species Name = BAND DESTROYED/LOST` + `Code IBP = D/L` + `Code BBL = 4/8` (exact inverse of import). Session view shows them as "Band destroyed"/"Band lost" with a "band event" chip; validation skips bird-field warnings for them. No schema field added (reuses `bbpCode`), so no bundle-version bump. See [research-destroyed-bands.md](docs/apps/field/research-destroyed-bands.md).
- Field 0.25.7 — The IBP (MAPS master list) agency export now fills the `Species Name` column with the common name resolved from the record's ALPHA code (via the species list), instead of leaving it blank. Where a sheet's typed name differs from the standard common name, the export uses the standard spelling (e.g. `Say's Phoebe`, `California Scrub-Jay`).
- Field 0.25.6 — Master-sheet import maps BBL unknown-age to our `U` code: Age NUMBER `0` (BBL unknown), or a blank number with an explicit `U` in the alpha column, now imports as `U` instead of blank. Closes the last age round-trip gap (re-export matches the master's `U`).
- Shared/Field 0.25.5 — **Bug fix:** correct the age codes to the USGS BBL standard. `AGE_CODES` and the export's `AGE_NUM_TO_ALPHA` had ASY/ATY/Local mislabeled — they were `4`=ASY, `6`=ATY, `8`=Local, but the BBL standard is `4`=Local, `6`=ASY (After Second Year), `8`=ATY (After Third Year). Affected the age dropdown, the IBP/BBL agency export's Age column, and master-sheet imports (which now read Hallie's standard `6`=ASY correctly). Numeric codes are unchanged, so existing records keep their stored values — but those values now carry the correct meaning.
- Field 0.25.4 — Master-sheet import now reconciles banders: a `JV → JVD` initials alias links Joanna van Dyk to her existing record, and any other bander initials not in People are auto-created as stub People + Banders (placeholder name = initials; set real names under People) and linked as session participants. Replaces the previous "not found in People" warnings — on Hallie's sheet this drops import warnings to ~3 (just the genuine data issues). The preview/result summary reports how many people were created.
- Field 0.25.3 — Master-sheet import now defaults imported bands' `bandType` to `Standard` (the sheet has no band-type column), replacing the previous blank value + per-band warning. Cuts the import warnings down to genuine issues.
- Field 0.25.2 — Correct the Mitchell Canyon station code from `MCFS` to `MICA` and its name to "Mitchell Canyon", across the `STATIONS` table, seed data, example/sample bundles, and the field specs. As with the Galindo Creek rename, this only affects the seed/defaults for fresh installs; existing databases are unchanged.
- Field 0.25.1 — Correct the Galindo Creek station code from `GCBS` to `GCFS` and its name to "Galindo Creek", across the `STATIONS` table, seed data, example/sample bundles, the agency-export test, and the field specs. Existing databases keep whatever code they already stored (this only affects the seed/defaults for fresh installs). Side benefit: importing Hallie's `GCFS` master sheet now matches the seed location instead of creating a stub.
- Shared: Expand the abbreviated `M-`/`H-`/`A-` prefixes on WRP code labels to their full words (`Minimum`/`Hatch Year`/`Adult`), e.g. `MFCF` now reads "Minimum First Cycle Formative" and `AFCF` "Adult First Cycle Formative". Codes are unchanged; labels are display-only, so existing records and the OCR app are unaffected.
- Field: Phase 24 — relabel the molt-limits "S Covs" tract to "G Covs" in the banding record form (display label only; the stored `moltLimitsSCovs` field and agency-export header are unchanged pending confirmation with Hallie).
- Field: Phase 24 — banding record form layout: place Age next to How Aged and Sex next to How Sexed (the secondary entries stay together below); reorder the Condition section to skull → CP → BP → Fat → body molt → ff molt → ff wear → juv body plumage.
- Field: Phase 24 — session bird list now shows the WRP code instead of the BBL age code.
- Repo: Gate the Pages deploy workflow on `npm run lint` + `npm test` in addition to the build, so a lint error or failing unit test stops the deploy.
- Repo: Upgrade Pages workflow actions to current majors (checkout v6, setup-node v6, upload-pages-artifact v5, deploy-pages v5) so they run on Node 24, clearing the Node 20 deprecation warning.
- Field: Phase 24 — Band Inventory: raise the Add Bands batch limit from 500 to 2000; remove the All Bands "first 200" cap so the full filtered list scrolls.
- Repo: Correct the `BandType` union in `@birdnerd/shared` to the values actually used (`Standard`, `Stainless-steel`, `4-short`, `Lock-on`), replacing the stale `Standard/Buffy/Giant/Lockout`.
- Field: Move `birdnerd-full-sample.json` into `apps/field/examples/`.
- Repo: Refresh conservative workspace dependencies before OCR engine work, including React, React DOM, React Hook Form, `@typescript-eslint/*`, and Vite `7.3.2` for current security fixes.
- Repo: Refresh transitive dependencies in `package-lock.json` via `npm audit fix` (lockfile-only, no `package.json` changes) before resuming sync spike work.
- Repo: Upgrade TypeScript from `5.9.x` to `6.0.3` across all workspaces. Zero type errors, no tsconfig changes needed.

### Added

- Field 0.25.0 — Phase 25 Bulk Data Import: upload Hallie's master banding CSV from Data Manager. Sessions are derived per station + date, bands and records are loaded, and unknown stations get a stub location. Upload shows a preview summary (sessions/bands/records to create, plus skips/warnings/rejects) before anything is written; **skip-if-exists, never overwrites** existing data. Band-status rows (`BAND DESTROYED`/`BAND LOST`) create bands only. Soft warnings and a downloadable rejects CSV; nothing blocks. Column mapping is the inverse of the IBP agency export.
- Sync 0.2.0: Model `BirdRecord` as `Y.Map` entries in Yjs with real-time CRUD sync across peers. Add/edit/delete banding records from either tab and watch changes propagate instantly.
- Sync 0.1.0: Scaffold `apps/sync-spike` workspace with Yjs + y-webrtc. Two browser tabs (or devices) join a shared room code and sync a textarea via WebRTC using public signaling.
- Repo: Add `dev:sync`, `dev:sync:host`, and `build:sync` root scripts for the sync spike workspace.
- Repo: Add a repo-level changelog to track shipped changes separately from the forward-looking plan.
- Field: Phase 24 — add band sizes `4A`, `5`, `6`; add skull code `8 — Invisible`; add disposition code `X — Ectoparasite`.
- Repo: Add a Playwright E2E smoke harness for the field app (`apps/field/e2e/`, `npm run test:e2e`) — app-boot, key-screen render, and commit-1 code-table regression guards; not CI-gated.
- Field: Phase 24 — add the "Alula" molt-limit tract (`BirdRecord.moltLimitsAlula`) to the banding record form and the app CSV round-trip; bump JSON bundle schema v4 → v5 (additive — older records validly omit it, no backfill).
- Field: Phase 24 — capture-time quick-select offering standard 30-min net-check slots derived from the session open/close window, so banders pick a check time instead of typing it.
- Field: Phase 24 — Band Inventory "By Size & Type" breakdown, a "Strings by 100s" range summary in All Bands, and Export Inventory (CSV).
- Field: Phase 24 — modify (size / type / status) and delete a band from the band detail view; delete warns when the band is referenced by banding records.
- Field: Phase 24 — read-only record view (disabled full form), reached via "View" on a session record and via Data Manager → Browse Records (grouped by session).
- Repo: Phase 24 test-buildout (field 0.24.3) — Playwright data round-trip coverage: a shared rich-record fixture (`e2e/helpers.ts`) plus a record save→reopen round-trip and a JSON bundle export→import round-trip (bundle v5). Guards the field-completeness / silent-data-loss class (e.g. the Alula reload gap).
- Repo: Phase 24 test-buildout (field 0.24.4) — add a band-deployment e2e (recording a new banding flips the selected band to "deployed") + a shared `addBandBatch` helper.
- Repo: Phase 24 test-buildout (field 0.24.6) — add band-recapture (links to the deployed band, two encounters, no re-deploy) and deployed-band delete-warning e2e; shared `selectBand` helper.
- Repo: Field 0.24.7 — dedup the band e2e specs by extracting `deployBand` and `openBandList` helpers (the deploy-a-band preamble and View-All-Bands navigation were duplicated across all three band specs).
- Repo: Field 0.24.8 — internal cleanup of `agencyExport.ts` (output unchanged): index the export context once per run so FK lookups are O(1) instead of per-record linear scans; extract `num()`/`dateParts()` helpers; hoist `Mist net`/`R` to named defaults; collapse the three `exportX` wrappers; drop dead `speciesNameFromCode`. Added a header↔row column-count guard test.
- Repo: Field 0.24.9 — add Playwright characterization coverage for the Banding Sessions list (`SessionList`, previously untested): empty state, MAPS-period conditional field, summary line, newest-first ordering, and row delete. Shared `openSessionList` helper. Unblocks a future cleanup refactor of that page.


### Fixed

- Repo: Repair the field-app lint — add an ESLint 9 flat config (`apps/field/eslint.config.js`: js + typescript-eslint recommended, React Hooks baseline) and drop the invalid `--ext` flag from the `lint` script. `npm run lint` now runs (it previously errored with no config present).
- Field: Sync `SpeciesAutocomplete` input to external value changes so opening an existing banding record shows the saved species code instead of an empty field.

### Removed

- Repo: Drop the unused root `package.json` `version` field. Each workspace owns its own version; the changelog tracks repo-level history.
- Field: Phase 24 — remove skull code `X — Not checked`.

---

**Older entries** (through 2026-04-12 — monorepo migration, Shared/Field 0.22.0, OCR 0.1.0–0.4.1) are archived in [docs/archives/CHANGELOG.2026-04.md](docs/archives/CHANGELOG.2026-04.md).
