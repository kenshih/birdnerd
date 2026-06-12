# Research: Banding Codes Summary (2023) vs MAPS Manual (2025)

**Date:** 2026-06-11
**Sources:**
- `nogit/Banding Codes Summary.pdf` — "MAPS BANDING CODES - 2023" (2 pages; codes + WRP ageing)
- `nogit/MAPSManual25.pdf` — "MAPS Manual: 2025 Protocol" (Institute for Bird Populations); code definitions on printed pp. 45–66

**Question:** Are the codes in the 2-page Banding Codes Summary consistent with the 100-page MAPS Manual?

**Answer:** Largely yes. Every quantitative scale and the bulk of the letter/WRP codes match. The differences are all attributable to the summary being the **2023** code set while the manual is the **2025 protocol** — the 2025 version added a few disposition and feather-pull codes and one WRP edge case.

---

## Consistent (codes + meanings match)

- **Skull Pneumaticization** — 0–6, 8
- **Cloacal Protuberance** — 0–3
- **Brood Patch** — 0–5
- **Fat** — 0–7
- **Body Molt** — 0–4
- **Flight-feather Molt** — N / A / S / J
- **Flight-feather Wear** — 0–5
- **Juvenile Body Plumage** — 3 / 2 / 1 / 0
- **Molt Limits & Plumage** — all 10 letters: J / L / F / B / R / M / A / N / X / U
- **Status** — manual defers to the BBL Bander Portal lookup tables; the summary's 300 / 301 / 318 / 325 / 500 / 700 / 000 don't contradict it
- **WRP** — cycle/molt-status/plumage three-character system and the common code list (FPJ … UCU, plus less-common SCB / TPB / TCB) match

---

## Real discrepancies (2025 manual has codes the 2023 summary lacks)

### 1. Disposition (DISP)
- 2023 summary codes: M, O, W, I, B, S, L, E, P, T, **D = "Dead (or permanently removed)"**
- 2025 manual **adds**:
  - **F** — fouled feathers, typically from oil
  - **R** — band removed from bird, then bird released bandless (only for leg injuries where the other leg cannot be banded)
- 2025 manual **redefines D**: "Death due to a cause other than predation." The "permanently removed" sense the 2023 summary folded into D is now handled by the new **R** code.

### 2. Feather Pull (FTHR. PULL)
- 2023 summary lists only: **O** (two outer rectrices), **I** (one inner + one outer rectrix)
- 2025 manual lists four codes: **O, X, I, C**
  - **X** — R3 pulled from both sides of the tail
  - **C** — contour feathers only, pulled for feather sampling
  - Manual also notes O was "previously indicated by FTHR. PULL = P"

### 3. WRP ageing
- 2023 summary notes fourth cycle ("4") as "not typically used for MAPS purposes" and **omits the 4PB code**.
- 2025 manual includes **4PB** — Fourth prebasic molt (AGE = 8 / ATY) — in its less-common code list.
- 2023 summary lists an extra third-character plumage option **S = supplemental**; the 2025 manual's core third-character list is **J / F / A / B / X / U** (no S).

---

## Minor wording-only differences (not true conflicts)

- **CP code 3:** summary "larger at tip than at base" vs manual "larger in the middle than at the base" — both describe bulbous.
- **FF Wear:** summary "outer four primaries" vs manual "outer 4–5 primaries."
- **WRP T-cycle:** summary "used mostly for woodpeckers" vs manual "used rarely for woodpeckers."

---

## App code tables (`codes.ts` / `@birdnerd/shared`) vs 2025 manual

Checked the app's code tables against the 2025 manual. Numeric scales + WRP come from
[bandingCodes.ts](../../packages/shared/src/bandingCodes.ts) (`@birdnerd/shared`); disposition, status,
and molt-limits are defined locally in [codes.ts](../../apps/field/src/data/codes.ts). Date checked: 2026-06-11.

### Consistent (match the manual)

| Field | Verdict |
|---|---|
| **Fat** (`FAT_CODES`) 0–7 | Exact match (None/Trace/Light/Half/Filled/Bulging/Greatly Bulging/Very Excessive) |
| **Cloacal Protuberance** (`CP_CODES`) 0–3 | Exact match (None/Small/Medium/Large) |
| **FF Wear** (`FF_WEAR_CODES`) 0–5 | Exact match (None/Slight/Light/Moderate/Heavy/Excessive) |
| **FF Molt** (`FF_MOLT_CODES`) | Codes match (N/A/S/J); list order differs, harmless |
| **Skull / BP / Juv body plumage** | All numeric values present and correctly ordered (label nits below) |

### Real inconsistencies (need attention)

1. **Body Molt** (`MOLT_CODES`) — **labels shifted, "Trace" missing.**
   Manual: 0 none / 1 **trace** / 2 light / 3 medium / 4 heavy.
   App: 0 No molt / 1 **Light** / 2 Medium / 3 Heavy / 4 Very heavy.
   The app has no "trace" and every label from 1 up is off by one tier.

2. **Molt Limits & Plumage** (`MOLT_LIMITS_CODES`) — **two letters mislabeled.**
   - `M` is labeled "Molt" → should be **Mixed** (multiple generations of basic feathers; woodpeckers).
   - `X` is labeled "Mixed Formative & Alternate" → should be **Auxiliary (pre)formative** (Cardinalidae/Passerellidae).

3. **Disposition** (`DISPOSITION_CODES`) — **multiple problems.**
   - `M` is labeled "Mortality" → manual `M` = **Malformed** (e.g. crossed mandibles). The app has no Malformed code, and conflates M with death.
   - `X` = "Ectoparasite" is **not a MAPS disposition code** (non-standard / local addition).
   - **Missing** the two codes the 2025 manual added: **F** (fouled feathers, oil) and **R** (band removed, bird released bandless).
   - `D` = "Dead" vs manual "Death due to a cause other than predation" (minor).

4. **Feather Pull** — **structural mismatch.** The app stores feather pull as a **boolean (Y/N)** (`rec.featherPull`, exported as the `Feather Pull` / `Feather Pull BBL` columns). The manual's coded field (**O** outer two rectrices / **X** R3 both sides / **I** inner+outer / **C** contour for sampling) is not represented at all.

5. **How Aged / How Sexed** (`HOW_AGED_CODES`, `HOW_SEXED_CODES`) — **different code scheme.** The app uses BBL-style two-letter codes (SK, CL, BP, FF, LP, MB…). The MAPS manual uses single-letter codes (S, C, B, J, L, P, M, F, I, E, V, O for how-aged; C, B, J, P, I, E, W, T, O for how-sexed). Likely intentional (BBL vs IBP convention), but it is not the manual's scheme.

### Minor / label-only nits

- **Skull** (`SKULL_CODES`): `0` labeled "No skull visible" — misleading; `0` = none / not pneumatized. "Not visible / examined but indeterminable" is what `8` (Invisible) means. Percentage labels (~25/50/75/90%) are loose approximations of the manual's 6–33 / 34–66 / 67–94 / 95–99% bands.
- **Brood Patch** (`BP_CODES`): `5` labeled "Feathered" vs manual **Molting** (M — re-feathering/pinfeathers).
- **Juv Body Plumage** (`JUV_BODY_PLUMAGE_CODES`): `3` labeled "Heavy" vs manual **Full**.
- **WRP** (`WRP_CODES`): app carries a near-complete WRP matrix (superset of the manual's common-code list) — good. But it **omits 4PB** (fourth prebasic, AGE 8/ATY) that the 2025 manual lists, and it **retains supplemental (S) plumage codes** (FPS/FCS/…) that the 2025 manual dropped from its core character set. The `A`-adjunct is glossed "Adult" (deliberate app expansion); strictly the WRP `A` adjunct marks an SY-vs-HY distinction within FCF, not "adult".
- **Status** (`BIRD_STATUS_CODES`): manual defers to the BBL Bander Portal lookup, so not fully verifiable here. Note the app uses `---` for Mortality where BBL uses `000`; the `700` label ("Unbanded observation") differs from the 2023 summary's "Held over 24 hours for observation/rehabilitation"; and `325` (Radiotag/GPS) is absent while `319/333/334/380` were added.

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
