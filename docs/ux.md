# BirdNerd — User Experience & Screens

Overview of screens, layouts, and interaction patterns for the BirdNerd PWA.

---

## 1. Home Screen (Navigation Hub)

**Purpose:** Central entry point. All major workflows start here.

**Layout:**
```
┌─────────────────────────────────────┐
│         BirdNerd                    │
│                                     │
│  [Banding Data Collection]          │
│                                     │
│  [Session Data]                     │
│  [Band Inventory]                   │
│  [Project Location Data]            │
│  [View Data / Export]               │
│  [Report Bugs / Feedback]           │
│                                     │
│  Future: Photo Log, Addendums      │
└─────────────────────────────────────┘
```

| Button | Purpose | Leads To |
|--------|---------|----------|
| **Banding Data Collection** | Primary workflow (90% of field time) | Banding Form |
| **Session Data** | Create/manage daily sessions | Session List / Session Form |
| **Band Inventory** | View/manage USGS band inventory | Band Inventory Screen |
| **Project Location Data** | Register locations, manage nets | Location List / Location Form |
| **View Data / Export** | Review records, export to CSV/BBL/IBP | Data Table / Export Dialog |
| **Report Bugs / Feedback** | Email form (future integration) | Email client |

---

## 2. Banding Data Collection Form

**Philosophy:** Single scrollable form. Banders skip around freely (waiting for scale, pliers, ruler, master bander input). **No wizard.** All fields accessible at once.

**Form Structure (6 sections):**
```
┌──────────────────────────────────────┐
│  BirdNerd Banding Form               │
├──────────────────────────────────────┤
│                                      │
│  📋 IDENTITY SECTION                │
│   ├─ Band Number [search dropdown]  │
│   ├─ Capture Code [radio buttons]   │
│   └─ Species [autocomplete]         │
│                                      │
│  IDENTITY SECTION                   │
│   ├─ Age [select]                   │
│   ├─ How Aged [select]              │
│   ├─ WRP [select]                   │
│   ├─ Sex [radio buttons]            │
│   └─ How Sexed [select]             │
│                                      │
│  CONDITION SECTION                  │
│   ├─ Skull [select]                 │
│   ├─ Brood Patch [select]           │
│   ├─ Cloacal Protuberance [select]  │
│   ├─ Fat [select]                   │
│   ├─ Body Molt [select]             │
│   ├─ FF Molt [select]               │
│   ├─ FF Wear [select]               │
│   └─ Juv Body Plumage [select]      │
│                                      │
│  MOLT LIMITS & PLUMAGE TABLE        │
│   │ Field │ Left │ Right │          │
│   ├───────┼──────┼───────┤          │
│   │ PCovs │ [__] │ [__]  │          │
│   │ SCovs │ [__] │ [__]  │          │
│   │ PP    │ [__] │ [__]  │          │
│   │ SS    │ [__] │ [__]  │          │
│   │ Tert  │ [__] │ [__]  │          │
│   │ Rec   │ [__] │ [__]  │          │
│   │ Body  │      [__]    │          │
│   │ Non-F │      [__]    │          │
│   └───────┴──────┴───────┘          │
│                                      │
│  MORPHOMETRICS & STATUS             │
│   ├─ Wing [number] mm               │
│   ├─ Tail [number] mm               │
│   ├─ Tarsus [decimal] mm            │
│   ├─ Culmen [decimal] mm            │
│   ├─ Other Measurement [decimal]    │
│   ├─ Body Mass [decimal] g          │
│   ├─ Status [composite code]        │
│   └─ Disposition [select]           │
│                                      │
│  ADDITIONAL INFORMATION             │
│   ├─ Session ID [linked]            │
│   ├─ Bander [dropdown]              │
│   ├─ Capture Time [time picker]     │
│   ├─ Release Time [time picker]     │
│   │       [Tap to fill with now]    │
│   ├─ Net [dropdown from session]    │
│   ├─ Notes [text area]              │
│   ├─ ☐ Feather Pull                 │
│   ├─ ☐ Blood Sample                 │
│   └─ [ Save Record ] [ Cancel ]     │
│                                      │
└──────────────────────────────────────┘
```

### 2.1 Key Fields & Interactions

| Field | Type | Interaction Notes |
|-------|------|-------------------|
| **Band Number** | Dropdown + search | Type to search inventory. On match, show band size + type for verification. See Band Number Flow below. |
| **Capture Code** | Radio buttons (N, U, R, F, etc.) | Defaults based on band status. Restricted to valid options for selected band. |
| **Species** | Autocomplete combobox | Type common name → ALPHA code auto-populates (or vice versa). Matches against 1,323 species from BBL. |
| **Age** | Select | Options: U, L, HY, AHY, SY, ASY, TY, ATY. Makes How Aged optional if U. |
| **How Aged** | Select (25 codes) | Only shown if Age ≠ U. Codes from CodeTable. "OT" (Other) requires note. |
| **Sex** | Radio buttons (M, F, U) | Makes How Sexed optional if U. |
| **How Sexed** | Select (18 codes) | Only shown if Sex ≠ U. Codes from CodeTable. "OT" (Other) requires note. |
| **Molt fields** | Select (single letters/numbers) | Coded values per molt tables in CodeTable. |
| **Morphometrics** | Number inputs | Wing/Tail in whole mm. Tarsus/Culmen/Other in ##.## precision. Mass in ##.# g. Validation: soft warnings if outside species range. |
| **Status** | Composite code | Numeric (e.g., 300, 318, 500, 700). Built from base code + additional info. UI TBD: dropdown of presets vs. let user build? |
| **Release Time** | Time picker w/ button | "Tap to Fill" button populates current device time (HH:mm). |
| **Notes** | Text area | Auto-populates when validation rules trigger. User can add/edit. |
| **Feather Pull** | Checkbox | Default: unchecked (false). |
| **Blood Sample** | Checkbox | Default: unchecked (false). Validation: if checked, status must be valid for blood sampling. |

### 2.2 Band Number UX Flow

1. **User selects or searches band number** from dropdown
   - Shows: Band prefix, number, size, type
2. **Band found in inventory and unused (`available`)**
   - State: Available
   - Action: Capture Code defaults to "N" (New)
   - Proceed normally
3. **Band found in inventory and deployed** (already assigned to a bird)
   - State: Deployed
   - Alert: "This band was deployed on [date] to [species]"
   - Show encounter history table
   - Action: Capture Code restricted to "R" (Recapture) or compatible codes
4. **Band NOT found in inventory**
   - Alert: "FOREIGN RECAPTURE — This band is not in your inventory"
   - Action: Capture Code forced to "F" (Foreign)
5. **User selects "UNBANDED"**
   - Action: Capture Code = "U"
   - Status field becomes optional

---

## 3. Session Data

**Two views: List and Create/Edit**

### 3.1 Session List View

```
┌──────────────────────────────────────┐
│  Sessions                            │
│                                      │
│  [ Search / Filter ]                 │
│                                      │
│  2026-03-19 | Gal Creek | 6:30-13:00│
│  Location: GCFS | Protocol: MAPS 3  │
│  Master: HD | Banders: HD, TS, JW  │
│  Records: 42 | [Edit] [Delete]      │
│                                      │
│  2026-03-18 | Oasis | 7:00-12:30    │
│  Location: OASI | Protocol: Non-MAPS │
│  Master: JW | Banders: JW, LC       │
│  Records: 28 | [Edit] [Delete]      │
│                                      │
│  [ + New Session ]                   │
└──────────────────────────────────────┘
```

### 3.2 Session Create/Edit Form

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| **Location** | Dropdown | Location table | Required. Locked to one organization. |
| **Session Date** | Date picker | User input | Required. ISO format (YYYY-MM-DD). |
| **Protocol** | Select | CodeTable | Required. Options: MAPS, Non-MAPS, Burrowing Owl, Rehabbed-Bird, Saw-whet Owl, etc. |
| **MAPS Period** | Number input | User input | Optional. 1–10 if MAPS protocol. |
| **Open Time** | Time picker | User input | Required. When nets opened. |
| **Close Time** | Time picker | User input | Required. When nets closed. |
| **Master Bander** | Dropdown | Bander table, sorted by role | Required. Dropdown shows: Master Banders first, then Sub-permittees, then Banders. Active only. |
| **Session Participants** | Multi-select checkboxes | Bander table, active only | Required (≥1). Shows all active banders + their roles. Creates SessionBanderLog entries. |
| **Weather @ Open** | Weather form | Weather table | Optional. Temp, wind, cloud cover, precipitation. |
| **Weather @ Close** | Weather form | Weather table | Optional. Temp, wind, cloud cover, precipitation. |
| **Notes** | Text area | User input | Optional. Session-level notes. |

**Linked Data:**
- Shows count of nets available at this location
- After saving, user can immediately start logging banding records
- Each banding record will reference this session

---

## 4. Band Inventory

### 4.1 Band Inventory Overview (Dashboard)

```
┌──────────────────────────────────────┐
│  Band Inventory                      │
│                                      │
│  Stats:                              │
│  ├─ Total Issued: 4,250 bands        │
│  ├─ Deployed: 3,100                  │
│  ├─ Available: 1,050                 │
│  ├─ Destroyed/Lost: 100              │
│                                      │
│  By Size:                            │
│  ├─ Size 1.6: 420 avail | 380 depl  │
│  ├─ Size 2.0: 380 avail | 450 depl  │
│  ├─ Size 2.5: 250 avail | 270 depl  │
│  └─ ...                              │
│                                      │
│  [ View All Bands ] [ Add Bands ]    │
└──────────────────────────────────────┘
```

### 4.2 Band List View

| Column | Content | Filterable |
|--------|---------|------------|
| **Band #** | e.g., `1154-81501` | Yes (search) |
| **Size** | e.g., 2.0 | Yes (select) |
| **Type** | Standard, Buffy, Giant | Yes (select) |
| **Status** | available, deployed, destroyed, lost, replaced | Yes (select) |
| **Current Species** | ALPHA code (if deployed) | Yes |
| **Deployed Date** | ISO date | Yes (date range) |
| **Actions** | [View] [Edit] [Retire] | — |

### 4.3 Band Detail View (Future)

- Full band metadata
- Encounter history (all capture/recapture events)
- Search by band number

### 4.4 Add Bands (Bulk)

```
┌──────────────────────────────────────┐
│  Add Bands                           │
│                                      │
│  Prefix: [1154] (4-digit)            │
│  Start Range: [81501]                │
│  End Range: [81550]                  │
│  Size: [2.0] (select)                │
│  Type: [Standard] (select)           │
│                                      │
│  Preview: 1154-81501 to 1154-81550   │
│           (50 bands)                 │
│                                      │
│  [ Add All ] [ Cancel ]              │
└──────────────────────────────────────┘
```

---

## 5. Project Location Data

### 5.1 Location List View

```
┌──────────────────────────────────────┐
│  Locations                           │
│                                      │
│  [ Search / Filter ]                 │
│                                      │
│  🔴 Galindo Creek Field Station      │
│    Code: GCFS | Nets: 8              │
│    Lat: 33.217° | Lon: -116.432°    │
│    [ Edit ] [ Delete ]               │
│                                      │
│  🟡 Oasis Visitor Center             │
│    Code: OASI | Nets: 5              │
│    Lat: 33.298° | Lon: -116.369°    │
│    [ Edit ] [ Delete ]               │
│                                      │
│  [ + New Location ]                  │
└──────────────────────────────────────┘
```

### 5.2 Location Create/Edit Form

| Field | Type | Notes |
|-------|------|-------|
| **Name** | Text | Display name (e.g., "Galindo Creek Field Station") |
| **Bander Location Code (Local)** | Text | 4-letter ALPHA code (e.g., GCFS). Set by bander. |
| **BBL Location Code** | Text | 6-letter code issued by BBL after submission. Nullable until submitted. |
| **Latitude** | Decimal number | Decimal degrees (e.g., 33.217). Optional future: GPS auto-capture. |
| **Longitude** | Decimal number | Decimal degrees (e.g., -116.432). |
| **Country** | Text | Default: "United States" |
| **State / Province** | Select | List of US states + territories. |
| **Remarks** | Text area | Location-specific notes. |

### 5.3 Net Management (within Location Detail)

**Sub-section: Nets at this Location**

```
┌─ NETS AT GCFS ─────────────────────┐
│                                    │
│  N-01 [Mist net]    [Edit][Delete]│
│  N-02 [Mist net]    [Edit][Delete]│
│  N-03 [Trap-A]      [Edit][Delete]│
│  ...                              │
│                                    │
│  [ + Add Net ]                     │
│                                    │
└────────────────────────────────────┘
```

**Add/Edit Net Form:**

| Field | Type | Notes |
|-------|------|-------|
| **Label** | Text | Net identifier (e.g., "N-01", "Trap-A"). Unique within location. |
| **Type** | Select | Mist net, Trap, Harp, etc. |

**Why here:** Nets are location-specific and reused across sessions. They're defined once, then referenced in SessionNetLog for each day's effort.

---

## 6. View Data & Export

### 6.1 Data Table (Browse Records)

```
┌──────────────────────────────────────────┐
│  Banding Records                         │
│                                          │
│  [ Session Filter ] [ Date Range ]       │
│  [ Species Filter ] [ Export ]           │
│                                          │
│  Date     │ Species │ Band # │ Age/Sex │
│  ─────────┼─────────┼────────┼─────────│
│  2026-03-19│ WBNU   │ 1154-81501 │ AHY/M  │
│  2026-03-19│ HOSP   │ UNBANDED   │ HY/? │
│  2026-03-18│ BUTN   │ 1173-64520 │ SY/F │
│  ...                                     │
│                                          │
│  Showing 1-50 of 1,247 records          │
│  [ < Prev ] [ Next > ]                   │
└──────────────────────────────────────────┘
```

### 6.2 Export Dialog

```
┌──────────────────────────────────────┐
│  Export Data                         │
│                                      │
│  Format:                             │
│  ○ CSV (Excel-compatible)            │
│  ○ BBL Upload Format (58 cols)       │
│  ○ IBP Internal Format               │
│  ○ CDFW Format (future)              │
│                                      │
│  Options:                            │
│  ☐ Include header row               │
│  ☐ Include notes field               │
│                                      │
│  Date Range: [from] [to]             │
│  Session: [all] [select]             │
│                                      │
│  [ Export ] [ Cancel ]               │
└──────────────────────────────────────┘
```

**Note:** The app stores data internally in **IBP format** and derives **BBL format** at export time via mappings from the LOOKUPS sheet.

---

## 7. Accessibility & Mobile Design

- **iPhone/iPad first:** All screens tested at 375px width (iPhone SE) and 768px (iPad)
- **Touch targets:** All buttons ≥44px × 44px for easy tapping
- **Keyboards:** Numeric inputs show numeric keyboard; time pickers use native mobile time inputs
- **Offline:** All screens work without network connection
- **Orientation:** Support both portrait (primary) and landscape (future)

---

## 8. Future Screen Ideas

- **Photo Log** — Attach photos to banding records
- **Datasheet Addendums** — Field notes, special observations, protocols
- **Band History** — Click a banded bird → show all previous encounters
- **Session Summary** — End-of-day report + effort calculation
- **Data Sync Status** — Show pending changes waiting to upload
