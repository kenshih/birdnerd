# Master sheet → app import/export round-trip

## What this is (note for Hallie)

Hi Hallie — as part of building the data-import feature, I ran a "round-trip" check to make sure the app loads your banding data faithfully. Here's what that means:

1. I started from your **Master Banding Data** sheet — the **first tab** of the Google Sheet you sent me ([link](https://docs.google.com/spreadsheets/d/1PkaE_Gfq6RohyUBjmGbeV6pdrRiXBnnc/edit?gid=792315412#gid=792315412)).
2. **Imported** it into the app.
3. Immediately **exported** it back out in the **IBP (MAPS master list)** format.
4. **Compared** that export against your original sheet, cell by cell.

The point is to see exactly what the app keeps, what it reformats, and what it intentionally leaves out — so we can be confident nothing important is lost, and so you can sanity-check anything that looks off. We tested on all 342 rows (330 bird records + 12 band-status rows like "BAND DESTROYED").

Everything below is a difference the test found, grouped by *why* it happens. They're all expected/by-design — none are data loss — but I'm listing them for your review.

---

## Structural (shape of the file)
1. **`BBL submit?` column dropped** — export has 49 columns vs the master's 50; the app doesn't track that field.
2. **12 rows missing** (342 → 330) — the `BAND DESTROYED` (9) + `BAND LOST` (3) rows become band-inventory entries, not bird records, so they don't appear in a *records* export.
3. **Row order differs** — export is grouped by session/date, not the master's original row order.

## By design (app stores a normalized subset)
4. **`Species Name` resolved from the ALPHA code** — the app stores the 4-letter code; on export it fills the common name from the official species list. Matches your sheet except where your typed name differs from the standard common name (5 cases — the export uses the standard spelling): `Says Phoebe`→`Say's Phoebe`, `California Scrub Jay`→`California Scrub-Jay`, and a few White-crowned Sparrow subspecies namings.
5. **`Feather Pull` `""` → `N`** (all rows) — the master left the non-BBL column blank; the app keeps a single yes/no feather-pull value and writes it to both Feather Pull columns.
6. **`How Sexed IBP` (197) / some `How Aged IBP` blanks → `NA`** — the master left the IBP method blank but put `NA` in the BBL column; the app fills the IBP column from the BBL value.
7. **`Body Mass` `10.0` → `10`** (33) — numeric reformat, same value.
8. **Unknown age** (16) — your sheet leaves **Age NUMBER** blank with `U` in the letter (Age) column; the app stores a single `U` code, so the re-export shows `U` in *both* age columns. Same meaning (Unknown), just more explicit. _(Open question for you: for unknown age, does the agency expect that numeric column blank, `0`, or `U`?)_

## Minor differences from translating between the IBP and BBL code systems
9. **`How Aged IBP` `J` → `P`** (5 rows) — juvenal and plumage both collapse to BBL `PL`, which reverse-maps to `P`. (The age itself is unchanged — just the aging *method* is generalized.)
10. **`How Sexed IBP 2` (second sexing method)** — `O` → `OT` (1 row, synonym); `F`/`L` → blank (2 rows; no standard BBL sexing equivalent, so dropped + flagged on import). These are *secondary* methods only — the sex and the primary method are kept.
11. **A few stray cells** (3 records) — `FALSE` Excel-artifact values in How Sexed BBL and FF Molt BBL (look like stray spreadsheet values) cleaned to blank/`N`; plus a couple of derived BBL molt cells where the source IBP column was blank.
