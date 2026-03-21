# Research Notes

Findings from source documents provided by Hallie (master bander), the Banding Metadata Sheet, and the MASTER BANDING DATA spreadsheet. These notes inform the product specification.

Source documents (in `nogit/`):
- `(Ken copy) bird app.docx.pdf` — Hallie's product vision document (color-coded: black=priority, blue=future, red=validation)
- `(Ken copy) Banding Metadata Sheet.pdf` — physical session metadata form (Mount Diablo Bird Alliance / MAPS Program)
- `(Ken copy) MASTER BANDING DATA.xlsx` — live Excel workbook with real banding data + agency upload sheets

---

## Key Insight: Band-Centric, Not Session-Centric

Hallie's doc reframes the app: think of it as a **"band deployment manager"** not a "session data manager." Data is anchored around USGS BBL-issued band numbers. Every band has a lifecycle (issued → deployed → recaptured → possibly replaced). Sessions are metadata that contextualize band encounters but are not the primary organizational unit for the data itself.

This is a significant architectural point — bands are the primary entity; records are encounters with bands.

---

## Four Data Categories

Hallie defines four core categories:

### 1. Session Data
Metadata collected at the start of each banding session. Not tied directly to banding records, but linked via a referenceable Session ID.

**Priority fields (black):**
- Session ID (auto-generated, referenceable)
- Protocol (dropdown: MAPS, Non-MAPS, Burrowing Owl Banding, Rehabbed-Bird Banding, Saw-whet Owl Banding, etc.)
- Date (mm/dd/yyyy, auto-fill from device)
- MAPS Period (see IBP period definitions)
- Project Location (dropdown of 4-letter codes from Location Manager)
- Effort Data: net numbers + open/close times + remarks per net
  - Remarks dropdown: "Closed early due to wind", "Closed early due to predators", "Opened late due to low temps", etc.
- Net hours completed (auto-calculated from effort data)
- Weather data: collected at **Open** and **Close**
  - Temperature (Celsius)
  - Wind (Beaufort scale or mph)
  - Cloud Cover (%)
  - Precipitation (select: fog, thick fog, drizzle, rain)
- Personnel list (dropdown: Master Bander/Sub-permittee names)
  - Current roster: Hallie Daly, Julie Woodruff, Tatyana Soto-Bartzi, Joanna van Dyk, Lucas Corneliussen
- Notes + Observations

**Future fields (blue):**
- Protocol selection driving different form templates
- Optional auto-populating results section (summary from linked banding data)

**From the physical Banding Metadata Sheet:**
- Confirms: Date, Station, Personnel, Net Number(s), Open Time, Close Time, Note #, Total Net Hours
- Weather Data: Temperature (C), Wind (mph or Beaufort), Cloud Cover (%)
- Results section: New, Unbanded, Recaptured, Daily Total, 2026 Total
- Notes/Observations section
- Header logo: Mount Diablo Bird Alliance / MAPS Program

### 2. Project Location Data
A location manager for banding sites. Relatively simple CRUD.

**Priority fields (black):**
- BBL Location ID (######, issued by BBL after submission — can be added later)
- Bander Location ID (4-letter ALPHA code, user-chosen)
  - Current locations: GCBS (Galindo Creek), LMEX (Lindsay Wildlife)
  - Note: app uses GCFS for Galindo Creek — confirmed correct by Ken
- Coordinates (decimal, e.g. 37.94008, -121.97276)
- Country (dropdown, or auto from coordinates)
- State/Province (dropdown, or auto from coordinates)
- Bander Remarks

**Future fields (blue):**
- GPS capture from device
- Net/Trap Inventory per location (type: 12m mist-net, 10m mist-net, walk-in trap; coordinates per trap/net)

### 3. Band Inventory
Band lifecycle management. Required by USGS BBL — every band's fate must be accounted for.

**Priority fields (black):**
- Band Number (format: XXXX-XXXXX or XXXX-XXXXXX)
  - Issued in strings of 100, continuous series: prefix (####) + suffix (#####(#))
- Band Size
- Band Type
- Quantity Deployed
- Quantity Remaining
- Quick inventory overview: by band size + type, deployed vs remaining
- Full list of all issued bands
- Auto-update on banding data submission
- Modifiable and exportable

**Future fields (blue):**
- Click on band number → full encounter history (deployment, recaptures, resightings)
- Resighting tracking (public encounters reported to BBL)
- Auxiliary markers (colored bands, 1-2 letters + 1-2 numbers) — possibly May 2026
  - Each auxiliary marker deployed with a BBL band
  - May not need separate inventory — just add to banding record during collection
- Band changes: old band removed, replaced with new band — both numbers linked to full history

**Hummingbird band prefixes** (from LOOKUPS sheet):
- Prefix → Alpha mapping (e.g. 9100→P, 9000→E, 8100→U, etc.)

### 4. Banding Data Collection (90% of field time)
The main data entry form. This is what we've been building.

**Required fields (marked with * in doc, black text):**

*Identity:*
- Band Number (dropdown from inventory; UNBANDED option; shows band size + type on selection)
  - If recaptured band with no records → "FOREIGN RECAPTURE" alert
  - If band has history → show encounter history table (Date, Activity, Sex, Age, WRP, Disposition)
- Code / Capture Status (1=New, U=Unbanded, R=Recapture, F=Foreign Recapture, 4=Destroyed, 5=Band Replaced, 6=Added to, 8=Band Lost, X=Banding Mortality)
- Species (common name entry, ALPHA code auto-populates)

*Age and Sex:*
- Age (U, L, HY, AHY, SY, ASY, TY, ATY)
- How Aged (BP, CC, CL, EG, EY, FB, FF, IC, LP, MB, MR, NA, NF, NL, NN, PL, RC, SK, OT)
  - Not required if Age = U
  - OT requires note
- WRP (extensive list — see LOOKUPS sheet, ~100+ codes across all cycles)
- Sex (M, F, U)
- How Sexed (BP, CC, CL, EG, EY, MB, NA, PL, TL, WL, FF, OT)
  - Not required if Sex = U
  - OT requires note

*Condition:*
- Skull (0-6, 8=Invisible)
- Brood Patch (0-5: None, Smooth, Vascular, Heavy, Wrinkled, Molting)
- Cloacal Protuberance (0-3: None, Small, Medium, Large)
- Fat (0-7: None through V. Excess)
- Body Molt (0-4: None through Heavy)
- Flight Feather Molt (N, A, S, J)
- Flight Feather Wear (0-5: None through Excessive)
- Juvenile Body Plumage (3=Full, 2=>1/2, 1=<1/2, 0=None)

*Molt Limits and Plumage (table format):*
- Columns: PCovs, SCovs, PP, SS, Tert, Rec, Body Plum, Non-Feather
- Each cell is a dropdown: J=Juvenile, L=Juv.&Form., F=Formative, B=Basic, R=Juv.&Basic, M=Mixed Basic, A=Alternate, N=Non-Juvenile, U=Unknown

*Morphometrics and Status:*
- Wing (mm, ## entry)
- Tail (mm, ## entry) — **NEW, not in our current form**
- Tarsus (mm, ##.## entry) — **NEW**
- Exposed Culmen (mm, ##.## entry) — **NEW**
- Other measurement (mm, ##.## entry)
- Mass (g, ##.# entry)
- Status (composite code: e.g. 300=healthy+banded, 700=rehabbed+banded, 500=sick/injured+banded, etc.)
  - "---" = Mortality (requires note)
  - Not required if unbanded
- Disposition (M, O, I, S, E, T, W, B, L, P, D)

*Additional Information:*
- Session ID (display date + location once selected)
- Bander ID
- Capture Time (hh:mm)
- Release Time (hh:mm, tap to auto-fill current time) — **NEW**
- Net/Trap (manual entry for now)
- Note (auto-populate from certain selections; allow additions)
- Feather Pull? (checkbox, backend: no=NO, yes=YES)
- Blood Sample? (checkbox, backend: no=NO, yes=YES)

**Validation rules (red text):**
- Code × Band history: can't report recapture as New/Destroyed/Band Lost; new bands must pair with unused inventory
- Species × Band size: validate; allow override with "Leg gauged" auto-note
- Sex=M + Brood Patch 3-4 → error
- Sex=F + Cloacal Protuberance 1-3 → error
- Skull required if SK selected in How Aged
- How Aged not required if Age=U; How Sexed not required if Sex=U
- OT in How Aged/Sexed → require note
- Status 500 → require disposition + note
- Mortality → require note
- Blood Sample → validate Status is 518 (should be 318?)
- Wing/Tail/Tarsus/Culmen/Mass → validate against known species ranges (tables to be provided)
- Other measurement → require note

**Future (blue):**
- App self-validation across contradicting data in multiple categories
- Link banding data to photos or addendum datasheets
- Consider different initial selection flow based on New/Recapture/Unbanded

---

## Export Requirements

**Priority (black):**
- Report bugs/give feedback mechanism

**Future (blue):**
- Agency-specific export formats (BBL, IBP, CDFW each have different codes/layouts)
- The master spreadsheet already has formula-driven sheets: `BBL UPLOAD` (58 cols) and `R UPLOAD` (60 cols) that transform MASTER data into agency format
- Export straight into required Excel layouts

---

## Master Spreadsheet Structure

The `MASTER BANDING DATA.xlsx` reveals the real-world data model:

### MASTER sheet (50 columns, ~993 rows of real data)
Headers: Bander, Code IBP, Code BBL, Band Size, Band Number, Species Name, ALPHA Code, Age NUMBER, Age, How Aged IBP, How Aged BBL, How Aged IBP 2, WRP, Sex, How Sexed IBP, How Sexed BBL, How Sexed IBP 2, Skull, Cloacal Protuberance, Brood Patch, Fat, Body Molt IBP, Body Molt BBL, FF Molt IBP, FF Molt BBL, Flight Feather Wear, Juv. Body Plumage, P covs, S covs, PP, SS, Tert, Rec, Body Plum, Non-Feath, Wing, Body Mass, Status, Month, Day, Year, Capture Time, Station, Net, Disposition, Note, Feather Pull, Feather Pull BBL, Blood Sample BBL, BBL submit?

Key observations:
- **Dual code systems**: Many fields have IBP and BBL variants (e.g. How Aged IBP vs How Aged BBL, Body Molt IBP vs Body Molt BBL) — these are formula-converted
- **Band Number** is numeric (e.g. 115481501, 142263301)
- **Bander** is stored as 2-letter initials (e.g. HD = Hallie Daly, TS = Tatyana Soto-Bartzi)
- **Date** stored as separate Month, Day, Year columns
- **Capture Time** stored as numeric (e.g. 710 = 07:10)
- **Station** uses GCFS
- **BBL submit?** tracks whether record has been submitted

### BBL UPLOAD sheet (58 columns)
Formula-driven from MASTER. Maps internal codes to BBL's expected format. Includes fields not in our app yet: Banded Leg, Eye Color, various swab fields, ectoparasite fields, etc.

### R UPLOAD sheet (Recaptures, 60 columns)
Similar formula-driven sheet for recapture submissions to BBL.

### SPECIES sheet (1,323 species)
Full BBL species list with: SPECIES_ID, ALPHA_CODE, SPECIES_NAME, SCI_NAME, FRENCH_NAME, SPANISH_NAME. This is the authoritative species list we should use.

### LOOKUPS sheet
Complete reference tables for:
- Age codes (with descriptions and comments)
- Sex codes
- Disposition codes (1=Add/New, 4=Destroyed, 5=Replacing Band, 6=Added-To, 8=Band Lost, 9=Record Lost, D=Double Banded 1st, S=Double Banded 2nd, X=Banding Mortality)
- How Aged (25 codes with descriptions, comments, and which ages they apply to)
- How Sexed (18 codes with descriptions and comments)
- Bird Status (codes 2-9 with detailed descriptions)
- Bird Status Extra Info (codes 00-99 with detailed descriptions — the "additional information" suffix)
- How Captured (25 methods)
- WRP Molt Cycle codes (~120 codes across cycles 1-9 + definitive + unknown)
- Hummingbird Band Prefixes (prefix → alpha mapping)

---

## Open Questions

1. **Galindo Creek location code**: Updated to use GCBS (Galindo Creek Banding Station) as the official 4-letter code for the app.

2. **Blood Sample validation**: Doc says "validate Status is 518" but the status codes don't include 518 — likely means Status 318 (healthy + banded + blood sample)?

3. **Status code structure**: Status appears to be a composite: base status (1 digit: 3=normal, 5=sick, 7=rehabbed) + additional info (2 digits: 00=band only, 18=blood sample, etc.). So 318 = normal + blood sample. The doc lists these combined (300, 318, 319, 333, 334, 380, 500, 700). Should the app present them as composites or let users build them from status + additional info?

4. **IBP vs BBL code mapping**: The spreadsheet maintains both. Should the app store one system and derive the other? Or store both?

5. **Lindsay Wildlife / rehabbed birds**: Location is where banded (Lindsay) but record should reflect release location. How to handle this — separate field? Note?

6. **Hallie's question to Ken**: "Would it be easiest for me to provide you with an excel for the backend data collection?" and "It may be best if we walk through the back end together sometime?" — Has this meeting happened?

7. **Empidonax flycatcher forms and Selasphorus hummingbird forms**: Hallie mentions special datasheets for these taxa. What do they look like? Are they addendum forms?

8. **Net/Trap linking**: Session effort data includes which nets were opened. Should banding records validate that the net number entered exists in the session's opened nets?

9. **Personnel → Bander ID mapping**: The spreadsheet uses 2-letter initials (HD, TS). Should the app store initials, full names, or both? Need a bander registry.

10. **"Tail" field**: Listed in doc under morphometrics but not on the physical banding sheet we photographed. Is it collected at GCFS or only at other stations?
