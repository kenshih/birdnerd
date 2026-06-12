# Research: MAPS banding-data sheet — exact fields & order

**Date:** 2026-06-11
**Sources:**
- `nogit/MAPSManual25.pdf` — "MAPS Manual: 2025 Protocol" (IBP). Figure 7 (printed p. 43) is a completed Band-Size-'0' sheet; the field-by-field definitions are on printed pp. 40–66.
- Photographed field sheets in `docs/media/banding.sheet.*` (used in the second section below). Several
  exist; **`banding.sheet.smalls.rows.sheared.JPG` is the clearest for reading column headers.** Inventory:
  - `banding.sheet.2026.01.23.JPG` / `.sheared.jpeg` — local "BANDING Sheet", GCFS, 2026, Band Size 1A
    (banders SS Soren Santos, LC Lucas Corneliussen)
  - `banding.sheet.smalls.rows.JPG` / `.sheared.JPG` — local "BANDING Sheet", clearest headers
    (banders HD Hallie Daly, JV Joanna van Dyk)
  - `banding.sheet.hummingbird.rows.JPG` / `.sheared.jpg` — titled "**MAPS BANDING Sheet**" (IBP master
    template), Year 2024/25, Band Size U

**Purpose:** capture the canonical MAPS sheet fields in order for future reference, and check whether the photographed field sheet matches it.

---

## 1. MAPS 2025 banding-data sheet — fields in order

Left-to-right column order on the sheet. The order is taken from the manual's field-by-field
documentation (pp. 40–66) and cross-checked against Figure 7; where the printed sheet's column
order differs from the doc's section order, it is noted.

| # | Field (sheet label) | Notes |
|---|---|---|
| 1 | BANDER'S INITIALS | |
| 2 | CODE | Band/capture status (1 new, R recapture, etc.) |
| 3 | BAND NUMBER | |
| 4 | SPECIES NAME | |
| 5 | SPECIES ALPHA CODE | 4-letter alpha |
| 6 | AGE | |
| 7 | HOW AGED | On the printed sheet HOW AGED sits next to AGE, **before** WRP CODE (the manual's text section documents WRP before HOW AGED, but the form column order is AGE → HOW AGED → WRP CODE) |
| 8 | WRP CODE | Wolfe-Ryder-Pyle |
| 9 | SEX | |
| 10 | HOW SEXED | |
| 11 | SKULL | |
| 12 | CL. PROT. | Cloacal protuberance |
| 13 | BR. PATCH | Brood patch |
| 14 | FAT | |
| 15 | BODY MLT | Body molt |
| 16 | FF MOLT | Flight-feather molt |
| 17 | FF WEAR | Flight-feather wear |
| 18 | JUV. BDY PL. | Extent of juvenile body plumage |
| 19–26 | **MOLT LIMITS & PLUMAGE** (8 sub-columns) | PRI. COVS · SEC. COVS · PRIMARIES · SECONDS · TERTIALS · RECTRICES · BODY PLUM. · NON-FEATH |
| 27 | WING | Wing chord (mm) |
| 28 | BODY MASS | grams |
| 29 | STATUS | 3-digit BBL status code |
| 30 | DATE (MO / DAY) | two sub-columns: MO, DAY (year is on the page header) |
| 31 | CAPTURE TIME | start time of the net run, 24-hr |
| 32 | STATION | 4-char station code |
| 33 | NET | 2-digit net code |
| 34 | DISP | Disposition (injured/dead birds) |
| 35 | NOTE NUMBER | links to notes on back of sheet |
| 36 | FTHR. PULL | Feather pull (O/X/I/C) |
| — | NOTE | Free text, recorded on the **back** of the sheet (not a front column) |

Page-header fields (not columns): **Location**, **Band Size**, **Year**, **Page #**.

The eight MOLT LIMITS & PLUMAGE sub-columns each take a molt-limit letter code (J/L/F/B/R/M/A/N/X/U);
"Leave blank any field representing a feather tract that was not examined."

---

## 2. Comparison: photographed field sheet (`banding.sheet.2026.01.23.sheared.jpeg`)

**Conclusion: it is the same MAPS banding sheet — same fields, same order — on a locally-branded
template, with one substantive content difference in the Disposition legend.**

### Same as the manual form
- Header fields identical: **Location** (GCFS) · **Band Size** (1A) · **Year** (2026) · **Page #** (01).
- Same column set and order, columns 1–36 as listed above (BANDER'S INITIALS → … → FTHR. PULL),
  including the AGE → HOW AGED → WRP CODE ordering and the 8 MOLT LIMITS & PLUMAGE sub-columns
  with the "leave blank if you didn't look at that feather tract" instruction.
- **JUV. BDY PL. column is present** (confirmed by Ken, 2026-06-11): it sits directly to the **left**
  of the MOLT LIMITS & PLUMAGE block (i.e. between FF WEAR and PRI. COVS), even though the local
  template has no separate JUV. BDY PL. legend box.
- Top-of-sheet legend boxes match the manual's scales: CODE, AGE, HOW AGED AND HOW SEXED, WRP CODE,
  SKULL (0/1/2/3/4/5/6/8), CL. PROT., BR. PATCH, FAT, BODY MLT, FF MOLT (N/A/S/J), FF WEAR,
  MOLT LIMITS & PLUMAGE, DISP.
- HOW AGED / HOW SEXED legend uses the **single-letter MAPS codes** (S skull, C cloacal, B brood
  patch, M mouth/bill, E eye, W wing length, T tail length, L molt limit, P plumage, M molt, O other)
  — i.e. the manual's scheme, **not** the two-letter BBL codes the app currently uses
  (see [research-banding-codes-2023-vs-2025.md](research-banding-codes-2023-vs-2025.md), inconsistency #5).

Full column order is confirmed (clearer `smalls.rows.sheared.JPG` + Ken's read of the right edge,
2026-06-11): BANDER'S INITIALS → CODE → BAND NUMBER → SPECIES NAME → SPECIES ALPHA → AGE → HOW AGED →
WRP CODE → SEX → HOW SEXED → SKULL → CL. PROT. → BR. PATCH → FAT → BODY MLT → FF MOLT → FF WEAR →
**JUV. BDY PL.** → (8 MOLT LIMITS & PLUMAGE sub-columns) → WING → BODY MASS → STATUS → MO/DAY →
CAPTURE TIME → STATION → NET → **DISP → NOTE NUMBER → FTHR. PULL**. The four right-most header cells
read "DISP", "NOTE", "NUMBER", "FTHR. PULL" — i.e. DISP, the **NOTE NUMBER** field (its header wraps
across the "NOTE"/"NUMBER" cells), then FTHR. PULL. This matches the manual's field order exactly.

### Two template variants in use
- The **2026** sheets are titled "**BANDING Sheet**" with a local birding-alliance logo and a gmail
  contact (a locally-branded template).
- The **2024/25** hummingbird sheet is titled "**MAPS BANDING Sheet**" — the IBP master template
  (matches the manual's Figure 7 title).
- Same fields and order on both; only the header/branding differs.

### Differences from the 2025 manual form
- **Disposition legend is the pre-2025 set.** The photo sheet's DISP key lists Malformed, Old/healed
  injury, Illness/Disease, Stress/Shock, Eye injury, Tongue injury, Wing injury, Body injury, Leg injury,
  Predation, Dead — i.e. the **2023** disposition codes. It is **missing the two codes the 2025 manual
  added: F (fouled feathers/oil) and R (band removed, released bandless)**. So this physical template
  predates, or hasn't adopted, the 2025 disposition update.

### Fully confirmed (Ken, 2026-06-11)
- **JUV. BDY PL.** is present, directly left of the MOLT LIMITS & PLUMAGE block.
- The four right-most columns are **DISP, NOTE NUMBER, FTHR. PULL** (headers read "DISP" / "NOTE" /
  "NUMBER" / "FTHR. PULL").
- The local "BANDING Sheet" template therefore has the **same columns, in the same order, as the
  2025 MAPS manual form** — the only content difference is the older DISP legend (below).

**Bottom line:** functionally the same sheet and field order as the 2025 MAPS manual; the only
content-level difference found is that the printed DISP legend is the older (pre-2025) code set
lacking F and R.
