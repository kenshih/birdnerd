# Research: MAPS Banding Codes (2026 cheat sheet) vs MAPS Manual (2025)

**Updated:** 2026-06-12 — switched primary cheat-sheet reference from the 2023 to the 2026 edition; see revision note at bottom.
**Date:** 2026-06-11
**Sources:**
- `docs/resources/MAPS-Materials-MAPS-Banding-Codes-Summary-2026.pdf` — "MAPS BANDING CODES - 2026" (2-page cheat sheet) — **primary quick reference**
- `docs/resources/MAPSManual25.pdf` — "MAPS Manual: 2025 Protocol" (IBP, ~100 pp.); code definitions on printed pp. 45–66 — **authoritative detail**
- `docs/resources/bbl-bird-status-codes.md` — BBL Bander Portal status codes (https://www.pwrc.usgs.gov/BBL/Bander_Portal/login/birdstatus.php); explains the single-digit + two-digit structure behind the three-digit MAPS codes — **reference for status codes not in MAPS docs**
- ~~`nogit/Banding Codes Summary.pdf`~~ — 2023 edition, superseded by the 2026 cheat sheet above

**Question:** Does the 2026 cheat sheet align with the 2025 manual, and are there remaining gaps?

**Answer:** Yes — the 2026 cheat sheet is a substantial improvement over the 2023 edition and aligns with the 2025 manual on almost everything. Two small gaps remain: Disposition codes F/R (in the manual but not the cheat sheet), and Feather Pull codes X/C (same). See detail below.

---

## Consistent (2026 cheat sheet matches 2025 manual)

- **Skull Pneumaticization** — 0–6, 8
- **Cloacal Protuberance** — 0–3
- **Brood Patch** — 0–5
- **Fat** — 0–7
- **Body Molt** — 0=None / 1=Trace / 2=Light / 3=Medium / 4=Heavy ✅ *(2023 had shifted labels; 2026 fixed)*
- **Flight-feather Molt** — N / A / S / J
- **Flight-feather Wear** — 0–5
- **Juvenile Body Plumage** — 3 / 2 / 1 / 0
- **Molt Limits & Plumage** — all 10 letters J / L / F / B / R / M / A / N / X / U; **M = Mixed** ✅ *(2023 had M mislabeled; 2026 fixed)*
- **Status** — 2026 lists 300 / 301 / 318 / 325 / 500 / 700 / 000, matching the manual's named codes ✅
- **Disposition M** — 2026 correctly has **M = Malformed** ✅ *(2023 had M as "Mortality"; 2026 fixed)*
- **WRP** — three-character system and common code list match; 2026 includes **X = auxiliary formative** as a third-character option ✅

---

## Remaining gaps (2025 manual has codes the 2026 cheat sheet omits)

### 1. Disposition (DISP)
- 2026 cheat sheet: M, O, W, I, B, **X (Ectoparasite)**, S, L, T, E, D
- 2025 manual **adds** (not in cheat sheet):
  - **F** — fouled feathers, typically from oil
  - **R** — band removed, bird released bandless (leg injury only; other leg cannot be banded)
- 2025 manual **omits X (Ectoparasite)** — present in cheat sheet but not listed in the manual's disposition codes
- 2025 manual **redefines D**: "Death due to a cause other than predation" (cheat sheet still says "Dead or permanently removed")

### 2. Feather Pull (FTHR. PULL)
- 2026 cheat sheet: **O** (two outer rectrices), **I** (one inner + one outer rectrix) — same two codes as the 2023 edition
- 2025 manual adds: **X** (R3 from both sides of tail), **C** (contour feathers only, for sampling)
- Manual notes O was "previously indicated by FTHR. PULL = P"

### 3. WRP — minor edge cases only
- 2026 cheat sheet notes fourth cycle ("4") as "not typically used for MAPS purposes" — consistent with the manual.
- 2026 does **not** list **4PB** (fourth prebasic, AGE 8/ATY) that the manual includes in its less-common code list.
- 2026 third-character list omits **S = supplemental** — consistent with the 2025 manual dropping S from its core set.

---

## What changed 2023 → 2026 (resolved discrepancies)

| Field | 2023 problem | 2026 status |
|---|---|---|
| Body Molt labels | No "Trace"; labels 1–4 all off by one | ✅ Fixed: 0=None/1=Trace/2=Light/3=Medium/4=Heavy |
| Disposition M | Labeled "Mortality" | ✅ Fixed: M = Malformed |
| Molt Limits M | Labeled "Molt" (app inherited this from 2023) | ✅ 2026 correctly shows M = Mixed |
| Status codes | Not listed on 2023 cheat sheet | ✅ 2026 lists 300/301/318/325/500/700/000 |
| WRP X (aux. formative) | Not listed as third-character option | ✅ 2026 includes X = auxiliary formative |

---

## Minor wording-only differences

- **CP code 3:** cheat sheet "larger at tip than at base" vs manual "larger in the middle than at the base" — both describe bulbous.
- **FF Wear:** cheat sheet "outer four primaries" vs manual "outer 4–5 primaries."
- **WRP T-cycle:** cheat sheet "used mostly for woodpeckers" vs manual "used rarely for woodpeckers."

---

## App code tables (`codes.ts` / `@birdnerd/shared`) vs 2026 cheat sheet + 2025 manual

Checked the app's code tables against both sources. Numeric scales + WRP come from
[bandingCodes.ts](../../packages/shared/src/bandingCodes.ts) (`@birdnerd/shared`); disposition, status,
and molt-limits are defined locally in [codes.ts](../../apps/field/src/data/codes.ts). Date checked: 2026-06-12.

### Consistent (match the manual)

| Field | Verdict |
|---|---|
| **Fat** (`FAT_CODES`) 0–7 | Exact match (None/Trace/Light/Half/Filled/Bulging/Greatly Bulging/Very Excessive) |
| **Cloacal Protuberance** (`CP_CODES`) 0–3 | Exact match (None/Small/Medium/Large) |
| **FF Wear** (`FF_WEAR_CODES`) 0–5 | Exact match (None/Slight/Light/Moderate/Heavy/Excessive) |
| **FF Molt** (`FF_MOLT_CODES`) | Codes match (N/A/S/J); list order differs, harmless |
| **Skull / BP / Juv body plumage** | All numeric values present and correctly ordered (label nits below) |

### Real inconsistencies (need attention)

1. **Body Molt** (`MOLT_CODES`) — **labels shifted, "Trace" missing.** Wrong vs both 2026 cheat sheet and 2025 manual.
   Correct (both sources): 0 none / 1 **trace** / 2 light / 3 medium / 4 heavy.
   App: 0 No molt / 1 **Light** / 2 Medium / 3 Heavy / 4 Very heavy.
   The app has no "trace" and every label from 1 up is off by one tier.

2. **Molt Limits & Plumage** (`MOLT_LIMITS_CODES`) — **two letters mislabeled.** Wrong vs both sources.
   - `M` is labeled "Molt" → should be **Mixed** (multiple generations of basic feathers; woodpeckers).
   - `X` is labeled "Mixed Formative & Alternate" → should be **Auxiliary (pre)formative** (Cardinalidae/Passerellidae).

3. **Disposition** (`DISPOSITION_CODES`) — **multiple problems.**
   - `M` is labeled "Mortality" → both 2026 cheat sheet and manual say `M` = **Malformed** (e.g. crossed mandibles). The app conflates M with death.
   - `X` = "Ectoparasite" — present in the 2026 cheat sheet but absent from the 2025 manual's list. Treat as non-standard; keep or remove based on Hallie's usage.
   - **Missing F and R** (added in the 2025 manual; not in the 2026 cheat sheet either — these are rare but real codes): **F** (fouled feathers, oil), **R** (band removed, bird released bandless).
   - `D` = "Dead" vs manual "Death due to a cause other than predation" (minor).

4. **Feather Pull** — **structural mismatch.** The app stores feather pull as a **boolean (Y/N)** (`rec.featherPull`, exported as the `Feather Pull` / `Feather Pull BBL` columns). The manual's coded field (**O** outer two rectrices / **X** R3 both sides / **I** inner+outer / **C** contour for sampling) is not represented at all.

5. **How Aged / How Sexed** (`HOW_AGED_CODES`, `HOW_SEXED_CODES`) — **different code scheme.** The app uses BBL-style two-letter codes (SK, CL, BP, FF, LP, MB…). The MAPS manual uses single-letter codes (S, C, B, J, L, P, M, F, I, E, V, O for how-aged; C, B, J, P, I, E, W, T, O for how-sexed). Likely intentional (BBL vs IBP convention), but it is not the manual's scheme.

### Minor / label-only nits

- **Skull** (`SKULL_CODES`): `0` labeled "No skull visible" — misleading; `0` = none / not pneumatized. "Not visible / examined but indeterminable" is what `8` (Invisible) means. Percentage labels (~25/50/75/90%) are loose approximations of the manual's 6–33 / 34–66 / 67–94 / 95–99% bands.
- **Brood Patch** (`BP_CODES`): `5` labeled "Feathered" vs manual **Molting** (M — re-feathering/pinfeathers).
- **Juv Body Plumage** (`JUV_BODY_PLUMAGE_CODES`): `3` labeled "Heavy" vs manual **Full**.
- **WRP** (`WRP_CODES`): app carries a near-complete WRP matrix (superset of the manual's common-code list) — good. But it **omits 4PB** (fourth prebasic, AGE 8/ATY) that the 2025 manual lists, and it **retains supplemental (S) plumage codes** (FPS/FCS/…) that the 2025 manual dropped from its core character set. The `A`-adjunct is glossed "Adult" (deliberate app expansion); strictly the WRP `A` adjunct marks an SY-vs-HY distinction within FCF, not "adult".
- **Status** (`BIRD_STATUS_CODES`): see expanded section below.

---

### Status codes — full reconciliation

**Sources:**
- `BIRD_STATUS_CODES` in `apps/field/src/data/codes.ts` — current app table
- `MAPS-Materials-MAPS-Banding-Codes-Summary-2026.pdf` — canonical MAPS 2026 reference (2-page cheat sheet)
- `docs/resources/MAPSManual25.pdf` p.64 — notes codes are at the BBL Bander Portal lookup table; names only 300/301/500/000
- `bbl-bird-status-codes.md` — full BBL single-digit status codes + two-digit additional-information codes; source for derivation column below
- **Hallie original** (early 2026) — first pass definitions from `docs/resources/2026.Mar.(Ken copy) bird app.H.orig.thoughts.docx.pdf`; see verbatim block below
- **Hallie confirmed** (~2026-06-10, GH issue #1) — refined definitions + UX requirements

#### Hallie's original list (early 2026)

**Source:** [`docs/resources/2026.Mar.(Ken copy) bird app.H.orig.thoughts.docx.pdf`](2026.Mar.\(Ken%20copy\)%20bird%20app.H.orig.thoughts.docx.pdf)

Verbatim:

> *Status (many different ones, but common for now; selection: 300 – healthy + banded, 700 – Rehabbed and Banded, 500 – Sick/Injured/Stressed and banded (require disposition to be filled and note), 301 – healthy, banded, + color banded, 318 – healthy, banded, and blood sample, 319 – healthy, banded, auxiliary, blood sample, 333 – healthy, banded, taken from artificial nest structure, 334 – healthy, banded, auxiliary, taken from artificial nest structure, 380 – healthy, satellite/cell/gps transmitter, "---" – Mortality (require note), Other (require note) (do NOT require Status entry if unbanded)*

Key observations:
- 333, 334, and 380 were correctly described here all along — our app labels ("Recaptured, no blood" / "Recaptured + blood sample" / "Released unbanded") were wrong from day one and should be fixed.
- 325 is not mentioned — not used at this station.
- "do NOT require Status entry if unbanded" — status field is optional when bird is unbanded; this is an additional UX rule not captured in the June confirmation.
- 500 originally noted it requires disposition + note (consistent with June confirmation of remarks required for non-300).

#### Reconciliation table

| Code | Our label (codes.ts) | Hallie original (early 2026) | MAPS 2026 | Hallie confirmed (~Jun 10, 2026) | BBL derivation (status + info) | Suggested label | Action |
|---|---|---|---|---|---|---|---|
| `300` | Normal, banded, released | healthy + banded | Normal, healthy, banded bird | **Healthy, released w/metal band** | 3 (normal) + 00 (metal band only) | "Healthy, released w/metal band" | ✅ fine |
| `301` | Color-banded | healthy, banded, + color banded | Healthy, color-banded bird | **Healthy, metal + color band | 3 + 01 (colored leg band) | "Healthy, metal + color band" | ✅ fine |
| `318` | Blood sample taken | healthy, banded, and blood sample | Blood sample; healthy, banded | **Healthy, metal band + blood sample** | 3 + 18 (blood sample) | "Healthy, metal band + blood sample" | ✅ fine |
| `319` | Color-banded + blood sample | healthy, banded, auxiliary, blood sample | *(not listed)* | **Healthy, metal + color band + blood** | 3 + 19 (blood + aux marker) | "Healthy, metal + color band + blood" | ✅ fine |
| `325` | *(missing)* | *(not listed)* | **Radiotag/GPS; healthy, banded** | *(not mentioned)* | 3 + 25 (2+ aux markers per BBL — ⚠️ BBL `380` = GPS alone; `325` = multiple aux markers) | "Radiotag/GPS, healthy, banded" | ➕ add (MAPS-official; label "Radiotag/GPS" is informal) |
| `333` | ~~Recaptured, no blood~~ | **healthy, banded, taken from artificial nest structure** | *(not listed)* | *(not in Jun confirmed list)* | 3 + 33 (taken from artificial nest structure, e.g. nest box) | "Healthy, banded, taken from artificial nest structure" | ❌ **fix label** — original was correct; app label was wrong |
| `334` | ~~Recaptured + blood sample~~ | **healthy, banded, auxiliary, taken from artificial nest structure** | *(not listed)* | *(not in Jun confirmed list)* | 3 + 34 (artificial nest structure + aux marker) | "healthy, banded, auxiliary, taken from artificial nest structure" | ❌ **fix label** |
| `380` | ~~Released unbanded~~ | **healthy, satellite/cell/gps transmitter** | *(not listed)* | *(not in Jun confirmed list)* | 3 + 80 (Satellite/Cell/GPS transmitter) | "Healthy, satellite/cell/gps transmitter" | ❌ **fix label** |
| `500` | Injured, released | Sick/Injured/Stressed and banded (require disp + note) | Banded but injured or diseased | **Injured/stressed/deformed/sick + metal band** | 5 (sick/injured/stressed) + 00 | "Injured/stressed/deformed/sick + metal band" | ✅ fine (slightly loose but acceptable) |
| `700` | Unbanded observation | Rehabbed and Banded | Held >24h for obs/rehabilitation | **Rehabilitated bird + metal band** | 7 (rehabilitated, held >24h) + 00 | "Rehabilitated bird + metal band" | ❌ **fix label** |
| `000` | *(missing)* | *(not listed)* | Unbanded or dead | *(maps to Hallie's `---`)* | MAPS special; not a standard BBL single-digit code | "Unbanded bird or banding mortality" | ➕ **add** |
| `---` | Mortality | "---" – Mortality (require note) | *(Hallie's notation)* | **Banding mortality** | Hallie's non-standard notation (maps to `000`) | "Banding mortality" | ✅ keep for import compat |
| `OT` | Other (add note) | Other (require note) | *(not a status code)* | Write-in option (remarks required) | App-local | — | ✅ keep; UX: require remarks |

**UX requirements from Hallie (both messages):**
- **Remarks required for anything other than 300** — all non-300 status codes should require a note.
- **Remarks required for `---`** — mortality always needs a note.
- **Write-in / "Other" option** — allow free-text code entry; remarks required.
- **Status not required for unbanded birds** — do not validate/warn if status is blank when bird is unbanded (original list: "do NOT require Status entry if unbanded").

**Actions (priority order):**

1. ❌ **Fix `700` label** → `"Rehabilitated bird, held >24h, metal band"`.
2. ❌ **Fix `333` label** → `"Normal wild bird from artificial nest structure"` (Hallie's original was correct; app label was wrong from the start).
3. ❌ **Fix `334` label** → `"Normal wild bird from artificial nest structure + aux marker"`.
4. ❌ **Fix `380` label** → `"Normal wild bird + GPS/satellite transmitter"`.
5. ➕ **Add `000 — Unbanded or dead`** (official MAPS).
6. ➕ **Add `325`** with label `"Normal wild bird + 2+ aux markers"`.
7. **UX: required remarks for non-300 / `---` codes.**
8. **UX: write-in option with required remarks.**
9. **UX: status field optional (no warning) when bird is unbanded.**

---

### Suggested fixes (highest value first)

1. Disposition: relabel `M` → Malformed, add `D`=death/`P` already present; **add `F` and `R`**; reconsider `X`=Ectoparasite.
2. Molt Limits: relabel `M` → Mixed and `X` → Auxiliary formative.
3. Body Molt: insert "Trace" at `1` and shift labels to match the manual.
4. Decide whether Feather Pull should become a coded field (O/X/I/C) or stay boolean by design.

## Bottom line

The summary is a faithful condensation of an earlier (2023) MAPS code set. The only substantive gaps versus the 2025 manual are:

1. **Disposition** — new **F** and **R**; **D** narrowed to non-predation death
2. **Feather Pull** — new **X** and **C**
3. **WRP** — the **4PB** / fourth-cycle edge case (and the dropped **S** = supplemental plumage character)

**Follow-up for the app:** verify whether `apps/field/src/data/codes.ts` reflects the 2025 set — specifically the F/R disposition additions and the X/C feather-pull additions.

---

## Master sheet findings: OT / --- / 000

Analysis of `nogit/2026.06.11.MASTER BANDING DATA.Hallie.csv` (column 38 = Status):

**Values actually present:** `300` (458 rows), blank (15 rows), `318` (5 rows), `700` (2 rows). No other values appear.

**"OT"** — no MAPS or BBL analogy. It never appears in the master sheet. It is a pure app-UI artifact (the field app uses it as an "Other" catch-all placeholder). Not a reportable code.

**"---"** — described in Hallie's original notes as the notation for mortality, no band applied. Never appears in the actual example master sheet data. BBL code can be derived and it means what Hallie says.

**"000"** — the official MAPS designation for unbanded or dead birds (see MAPS Manual 2025, and the MAPS cheat sheet). Also never appears in the master sheet. Conflicts with BBL "---"

**The 15 blank-status rows** are all `BAND DESTROYED` or `BAND LOST` records — band-fate events, not bird captures. Status is blank because there is no bird release to describe.

**Practical implication:** the correct behavior for band-fate records (and unbanded birds generally) is a blank Status field, not "---" or "000". The app should not warn or require Status when the record is a band-fate event or the bird was not banded. "000" could be added to the picker for completeness (it is a valid MAPS code), but it will likely go unused in Hallie's workflow.
