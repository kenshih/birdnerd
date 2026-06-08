# Master-sheet import → IBP export round-trip findings

Ran the round-trip through the app's actual import + IBP-export code. Here's how the re-exported IBP CSV differs from the original master sheet, grouped by cause. These are all expected/by-design differences.

## Structural (shape of the file)
1. **`BBL submit?` column dropped** — export has 49 columns vs the master's 50; the app doesn't model that field.
2. **12 rows missing** (342 → 330) — the `BAND DESTROYED` (9) + `BAND LOST` (3) rows become band-inventory entries, not bird records, so they don't appear in a *records* export.
3. **Row order differs** — export is grouped by session/date, not the master's original row order.

## By design (app stores a normalized subset)
4. **`Species Name` blank on all 330** — the app keys on the ALPHA code only; it doesn't store the common name.
5. **`Feather Pull` `""` → `N`** (all rows) — the master left the non-BBL column blank; the app has one feather-pull boolean and writes it to both Feather Pull columns.
6. **`How Sexed IBP` (197) / some `How Aged IBP` blanks → `NA`** — the master left the IBP method blank but put `NA` in the BBL column; the app fills the IBP column from the BBL value.
7. **`Body Mass` `10.0` → `10`** (33) — numeric reformat, same value.

## Minor lossy round-trips (our codes are BBL-centric)
8. **`How Aged IBP` `J` → `P`** — juvenal and plumage both collapse to BBL `PL`, which reverse-maps to `P`.
9. **`How Sexed IBP 2`: `O` → `OT`** (synonym); **`F`/`L` → blank** (no BBL mapping — dropped + warned, the 2 warnings you saw).
10. **`FALSE` Excel-artifact cells** (How Sexed BBL, FF Molt BBL) cleaned to blank/`N`; a couple of derived BBL molt cells where the source IBP was blank.
