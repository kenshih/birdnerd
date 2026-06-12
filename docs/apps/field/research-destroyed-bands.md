# Research — Lost / Destroyed Bands in Session Data

**Status:** research complete, design direction chosen, implementation NOT started.
**Owner pickup:** new session — start here, then implement under Phase 25 follow-up.
**Date:** 2026-06-10.

## Problem

When importing Hallie's master sheet, `BAND DESTROYED` / `BAND LOST` rows currently
create a **band only, no bird record** — so the event **disappears from the session**.
See the early `return` at `apps/field/src/utils/masterSheetImport.ts:227`:

```ts
// Band-event rows create the band only — no bird record.
if (bandEventStatus) return
```

`Band` also only holds a single current `status` (+ `deploymentDate`) — no date / station /
bander for the fate, and no link to the session where it happened.

## What the source data looks like

15 band-event rows in `nogit/2026.06.11.MASTER BANDING DATA.Hallie.csv`. Every one is
**shaped exactly like a normal record** (same ~50 columns) with bird fields blank and the
fate encoded in three columns:

| Column | Destroyed | Lost |
|---|---|---|
| `Species Name` | `BAND DESTROYED` | `BAND LOST` |
| `Code IBP` | `D` | `L` |
| `Code BBL` | `4` | `8` |

They DO carry session context: `Bander`, `Band Size`, `Band Number`, `Month/Day/Year`,
mostly `Station=GCFS`. One has `Capture Time` + `Note` ("band lost unknown location").

Findings from inspection:
- **No band-number collisions** — none of the 15 appear on any other row. So in this data
  every destroyed/lost band was removed from inventory *without* a bird encounter. No
  "deployed-then-lost" timeline exists in the data.
- **2 rows have no `Station`** (band `142263303` destroyed 2026-01-10; `187372702` lost
  2026-04-04). These hit the missing-station guard
  (`masterSheetImport.ts:191-194`) **before** the band-event logic and are **rejected
  outright today** — so those two bands aren't even created. Decision: **keep rejecting
  and report** in the rejects CSV (they can't form a station+date session; fix upstream).

## The collision that makes this a real design decision

Round-trip trace:
- **Export** (`agencyExport.ts:158-162`): `Code BBL ← bbpCode`,
  `Code IBP ← CAPTURE_CODE_TO_IBP[bbpCode] ?? bbpCode`, `Species Name ← speciesCode lookup`.
- **Import** maps the sheet's `Code BBL` → `bbpCode` for every row
  (`masterSheetImport.ts:259`).

But the band-event rows carry `Code BBL = 4/8`, and **`4` and `8` already mean recapture**
in our app — they're in `RECAPTURE_CODES` (`codes.ts:38`). So if we naively emit a record
and let the fate land in `bbpCode`:
- `isRecapture('4')` → true → destroyed band miscounted as a recapture in export tallies
  (`agencyExport.ts:469`). Wrong.
- `Species Name = "BAND DESTROYED"` can't be reconstructed on export (it's derived from
  `speciesCode`, blank here).

So the sheet's `Code BBL` column is **overloaded** — bird capture codes for bird rows,
band-disposition codes for band-event rows. A band fate isn't a capture; it doesn't belong
in `bbpCode` as a BBL numeric.

## MAPS Manual — how IBP models this (authoritative)

From `nogit/MAPSManual25.pdf` (p.38, 40, 41, 43):

1. **Lost/destroyed bands ARE rows in the Banding Sheet (session data):**
   > "Lost and destroyed bands should be recorded in sequence on the MAPS Banding Sheets.
   > Record only **code, band number, species name as 'Band Lost' or 'Band Destroyed,'
   > date, and station**." (p.38)

2. **The marker is the "CODE" (Capture Code) column — a value alongside N/R/U:**
   > "Use 'N' for all newly-banded birds; **'L' for lost bands; 'D' for destroyed bands**;
   > 'U' for unbanded birds; 'C' for changed bands; 'A' for added bands; and 'R' for all
   > other recaptures." (p.41)

   So MAPS' own "marker" is **not a separate orthogonal field — it's a distinct value of
   the capture code.** In our schema that's `bbpCode`. The native marker is the **IBP
   letter `L`/`D`** (not the BBL `4`/`8`).

3. **Band fate is never merged into a bird's row — even the worst case.** If a bird dies on
   a freshly-applied band, MAPS records the **bird on the Unbanded Sheet** and the **band as
   a separate code-`D` row** on the Banding Sheet, with `000` STATUS + `D`/`P` DISP (p.40).
   → Answers the open "two events on one record?" question: **no, MAPS splits them.** One
   capture-code value per row is always sufficient.

4. **Lost/destroyed bands are omitted from the mist-netting summary counts** (p.43: "omit
   lost and destroyed bands"). → They count as neither new nor recapture.

## Design direction (chosen — Option 2, specifics deferred)

Model band fates as **`BirdRecord`s with an explicit marker** (not a sibling `BandEvent`
entity, which would over-build band-history the data doesn't exercise; not derive-from-band,
which spreads re-inference across consumers).

The MAPS finding **sharpens** Option 2: the marker is best modeled as **adding `L` and `D`
as first-class capture-code values** (`bbpCode` / `CAPTURE_STATUS_CODES`) rather than a new
`bandEvent?` field — more MAPS-faithful and reuses the column the source already uses.

### Implementation checklist (to flesh out / confirm next session)
- [ ] Add `L` (lost) and `D` (destroyed) as capture-code values in `CAPTURE_STATUS_CODES`
      (`@birdnerd/shared`); keep `bbpCode` as the home.
- [ ] `isNewBanding` / `isRecapture` → treat `L`/`D` as **neither** (omit from tallies);
      align with the summary "omit lost and destroyed bands" rule.
- [ ] Import (`masterSheetImport.ts`): for band-event rows, **emit a `BirdRecord`** (drop
      the early `return`) with `bbpCode = L/D` (from `Code IBP`, NOT the BBL `4/8`),
      `speciesCode` blank, date/station/bander/size/note mapped, and still create the Band
      with `status: destroyed/lost`.
- [ ] Export (`agencyExport.ts`): for `bbpCode` `L`/`D`, reconstruct `Species Name =
      "BAND LOST"/"BAND DESTROYED"`, `Code IBP = L/D`, `Code BBL = 8/4`. Keep import = inverse.
- [ ] Session-browse / record view: render band-event rows sensibly (no bird fields).
- [ ] Validation: band-event rows skip bird-field warnings.
- [ ] Bundle schema: if any field added, bump `BUNDLE_VERSION` + migration. (Likely none if
      we only extend the code table + reuse `bbpCode`.)
- [ ] Station-less band-event rows: keep rejecting + report (no change needed).
- [ ] Tests: import emits records for L/D; export round-trips; tallies exclude L/D.

## Open question for Hallie / domain (low risk — data says no today)
Does a band ever need **two dated events** (deployed on a bird, then later lost/destroyed as
a separate row)? Today's data: no, and MAPS splits such cases into two rows anyway. If "yes"
ever shows up, that's the trigger to graduate to a `BandEvent` entity — and L/D-marked
records migrate cleanly.

## Deeper follow-up (separate, later)
Do a full pass over the MAPS Manual **codes section** (mid-document) to reconcile our code
tables (`codes.ts` / `@birdnerd/shared`) against MAPS. Out of scope for the band-fate fix;
tracked as its own plan item.
