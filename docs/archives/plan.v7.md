# BirdNerd — Plan archive v7 (Phases 24–25)

Archived from `docs/plan.md` on 2026-06-12 once both phases shipped. Forward-looking plan
continues in [docs/plan.md](../plan.md). Shipped-change detail also lives in
[CHANGELOG.md](../../CHANGELOG.md).

---

## Phase 24 — Field Small Fixes (Field 0.24.0) ✅

Goal: A batch of small, high-value field-app fixes from Hallie. All fields stay optional; soft warnings only.

_Prelude (done): thin Playwright smoke harness added (`apps/field/e2e/`, `npm run test:e2e`) so the UI-heavy commits below can be verified in a real browser without ad-hoc setup. Smoke = app-boot + key-screen render; plus regression guards on the commit-1 code tables. Detailed flows deferred (see Backlog)._

**Codes & form fields**
- ✅ Add band sizes `4a`, `5`, `6`
- ✅ Skull: add `8` (invisible); remove `X` (not checked). _Decision: legacy records with skull `X` map to `8` on import (Phase 25 importer to apply)._
- ✅ Add **Alula** to the molt limits & plumage section, ordered immediately after S covs (now G Covs) — captured in form + CSV + bundle (v5). _(Agency-export follow-up → Phase 25.)_
- ✅ Rename `S covs` → `G Covs` — display label only; stored field `moltLimitsSCovs` unchanged. _(Agency-export/data-key follow-up → Phase 25.)_
- ✅ Reorder the condition section read-out: skull → CP → BP → Fat → body molt → ff molt → ff wear → juv body plumage
- ✅ Disposition: add `X` for ectoparasite
- ✅ **WRP label expansion (#4):** expanded every `A`→Adult / `M`→Minimum / `H`→Hatch Year prefix to full words across all WRP code labels in `@birdnerd/shared` (shared 0.2.2 / field 0.24.10). Codes unchanged (display-only), so OCR + existing records unaffected.

**Form layout**
- ✅ Place age and how-aged next to each other; sex and how-sexed next to each other (leave the 2nd entries as-is for now)

**Band Inventory**
- ✅ Allow more than 500 bands per batch (raised cap to 2000)
- ✅ Band-inventory-by-size summary: differentiate Standard, Lock-on, Stainless Steel, and 4-short (now "By Size & Type")
- ✅ Delete or modify band inventory (edit size/type/status + delete, from the band detail view; delete warns when the band is referenced by records)
- ✅ All Bands view: show string range (by 100s)
- ✅ All Bands view: fix pagination/scroll — currently caps at first ~100–200 with no way to view the rest
- ✅ Export band inventory to share across devices (CSV export; cross-device restore also via the full JSON bundle in Data Manager)

**Views & read-only**
- ✅ View records in Data Manager (Browse Records, grouped by session → opens read-only view)
- ✅ View records within a session without editing ("View" button → read-only record)
- ✅ Session bird list: show WRP code instead of the BBL # for age
- ✅ Faster capture time: select a standard net-check interval (e.g. every 30 min) instead of toggling each time

Shipped **field 0.24.6 / shared 0.2.1**, plus a test-buildout + CI-hardening patch run (0.24.1 → 0.24.10): Pages-build typecheck fix; data round-trip e2e; band deployment / recapture / delete-warning e2e; CI gate (deploy runs lint + `npm test`); Pages actions upgraded to Node-24 majors; agencyExport internal cleanup; SessionList characterization. E2E is local-only (not CI-gated).

---

## Phase 25 — Bulk Data Import (Field 0.25.0) ✅

Goal: Get Hallie's existing banding data into the field app via an in-app CSV importer. Sequenced after Small Fixes so the form/code/inventory changes that affect the schema land first.

**Design** (data-shape conversation done, grounded in `nogit/MASTER-BANDING-DATA.csv` — 342 rows, 1 station `GCFS`, 37 days, Dec 2024–Mar 2026):

In-app CSV importer in Data Manager: upload → **preview summary** (sessions / bands / records to create, skips, rejects, warnings) → confirm → write to IndexedDB. Re-runnable.

Entity derivation:
- **Sessions** = station + date (~37). Distinct banders that day → `SessionBanderLog`; `masterBanderId` = HD when present among them, else blank. Protocol/weather left blank. Bander initials resolve to People via a small alias map (`JV`→`JVD`); unknown initials are auto-created as stub People + Banders (placeholder name = initials).
- **Bands** = every Band Number → inventory entry. Status: `deployed` (capture, Code IBP `N`), `destroyed` (`BAND DESTROYED`, `D`), `lost` (`BAND LOST`, `L`). `bandType` defaults to `Standard` (the master sheet has no band-type column).
- **BirdRecords** = the capture rows (330 here), linked to session + band. Band-fate (`BAND DESTROYED`/`LOST`) rows also emit a `BirdRecord` (see follow-up below) so the event stays in the session.
- `bbpCode` ← **Code IBP/BBL** (not the `Status` column). `Status` (BBL composite, e.g. `300`/`318`) → maps **directly** to `BirdRecord.status`; validate against `BIRD_STATUS_CODES`, soft-warn on values outside the table.
- **Aging/sexing (IBP vs BBL):** the sheet carries **both** code systems for each criterion — IBP single-letters and BBL 2-letter codes — and our app's codes *are* the BBL set, so the BBL columns map straight in with no translation. Primary criterion (`howAged`/`howSexed`) ← the **BBL column directly** — verified lossless on the 330 captures. The second criterion (`howAged2`/`howSexed2`) exists in the sheet **only as IBP single-letters**, so derive it via a deterministic IBP→BBL lookup (`P→PL, M→MR, S→SK, L→LP, C→CL, I→MB, F→FF, J→PL, E→EY, B→BP, O→OT`) — inverse of the agency export's BBL→IBP table; any IBP letter outside the table soft-warns and is dropped. Data wart: one `How Sexed BBL` cell is the Excel artifact `FALSE` → treat as blank + warn.
- Unknown station codes → auto-create a stub `Location` (blank lat/long to fill in later). The seed station was renamed `GCBS`→`GCFS` ("Galindo Creek") at field 0.25.1, so Hallie's `GCFS` sheet matches the seed location instead of creating a stub.

No-clobber: **skip-if-exists, never overwrite.** Match keys: band# (bands), station+date (sessions), band#+date (records). Skips reported in the summary.

Two outputs:
- **Rejects CSV** — only structurally un-importable rows (e.g. unparseable date). Original columns + a `_problem` column.
- **Warnings** — soft issues (unrepresentable code values, etc.) shown in the summary; rows still import.

Build steps (✅ shipped at field 0.25.0):
- ✅ ~50-column → record/session/band mapping (`masterSheetImport.ts`, inverse of the IBP export).
- ✅ IBP→BBL single-letter lookup for the second aging/sexing criterion; soft-warns on unmapped letters.
- ✅ Parser + entity builders + dedup as pure functions (`masterSheetImport.ts` + `applyMasterImport.ts`), tested without DB and with fake-indexeddb.
- ✅ Preview/summary UI + confirm + IndexedDB writes; rejects/warnings CSV download (Data Manager).
- ✅ Soft warnings only — never blocks; structural rejects routed to the rejects CSV.

**Follow-up — Lost/destroyed-band records ✅ (shipped field 0.25.8 / shared 0.2.4):** Band-event rows (`BAND DESTROYED`/`LOST`) used to create a band only and vanish from the session. MAPS models a band fate as a Banding-Sheet row marked with capture code `L`/`D` (Manual p.38/41) — so we emit a `BirdRecord` with `bbpCode = D/L` (from `Code IBP`, NOT the BBL `4/8` which mean recapture), added `D`/`L` to `CAPTURE_STATUS_CODES`, made `isNewBanding`/`isRecapture` omit them, and round-trip export back to `BAND LOST`/`DESTROYED` + `Code IBP D/L` + `Code BBL 8/4`. Station-less band-event rows keep rejecting. Full findings + checked-off checklist: [research-destroyed-bands.md](../apps/field/research-destroyed-bands.md).

**Remaining Hallie confirmations (carried forward to plan.md Phase 25 wrap-up):**
- **Molt-limits `S covs` vs `G covs`** — different feather tracts; confirm whether the Phase 24 relabel was intended or a mistake.
- **Alula in agency export** — master sheet has no `Alula` column; confirm whether to evolve the export format or keep Alula app-only.
- **`Status` column** — confirm whether the full master sheet uses status values outside our table so we can extend `BIRD_STATUS_CODES`.
