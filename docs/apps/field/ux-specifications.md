# BirdNerd — User Experience & Screens

Overview of screens, layouts, and interaction patterns for the BirdNerd PWA.

---

## 0. Authentication & Access

Google sign-in establishes an external identity; it does not by itself grant
access to BirdNerd. After a successful sign-in, Field resolves that identity
to a BirdNerd User Account and active Workspace Membership before showing any
workspace data or operational UI. This is a closed pilot: there is no
self-service account creation or Workspace joining. An Admin or restricted
Provisioner must pre-authorize the person's exact Google email address.

| Result after Google login | What Field shows | Available actions |
| --- | --- | --- |
| Not signed in | Google sign-in screen | Continue with Google |
| Resolving access | “Checking access…” screen | Wait; no workspace content is visible |
| No BirdNerd account or eligible Membership | “You don’t have access to BirdNerd yet” screen, including the signed-in email | Sign out or use another Google account |
| Pending Membership with matching pre-authorized email | Activation/linking progress, then the Workspace | Wait; activation is automatic and idempotent |
| Active Workspace Membership | Normal Field UI for the selected Workspace | Use capabilities permitted by the Membership role |

The access-denied screen must not create an account automatically, display
workspace data, or offer an in-app request/join flow. Its purpose is to make a
successful Google login understandable without implying BirdNerd access.

**Phase 29 scope:** The UI implements all of these outcomes, and a matching
pending Membership activates automatically, idempotently, and durably in the
local Event Log. A fresh deployed Field app still has no provisioned bootstrap
Events, so it correctly shows no access after a real Google login until the
separate Provisioner/Supabase hand-off exists.

**Phase 30 behavior:** Field replaces local activation with one authenticated
server-side initial-access claim. The claim derives the Google principal from
the session, atomically links/activates only a matching pending Membership, and
returns the canonical Events before normal Field screens or ordinary sync are
available. The progress screen remains until that result is durable; a failed
or ineligible claim shows the existing no-access screen. This remains neither
an in-app provisioning path nor a join request.

Roles are converted into UI capabilities at the Workspace boundary. A
Contributor sees the operational Field screens; an Admin additionally sees
Station, Net, Person/Bander roster, and User Account-to-Person link controls.
Phase 31 has no Field membership-management screen: a trusted operator uses
the Provisioner CLI for invitations, role changes, deactivation, and
reactivation. Hiding a page or button is UX only; server-side Event Admission
independently verifies active Membership and the Event type's minimum role.
See [ADR 0017](../../adr/0017-operational-workspace-authority.md) and
[ADR 0018](../../adr/0018-operational-event-catalog.md).

### 0.1 Collaboration Pilot

After active access, **Collaboration Pilot** opens the Phase 30 operational
Event workflow. It shows Workspace name and non-blocking sync state, then lets a
Member create a partial Session, select it, create partial Banding Records, and
amend a record. Every save completes locally before sync begins, so an offline
status never disables these actions. A repeated physical band appears in a
yellow conflict panel that explicitly says both facts remain for Contributor
or Admin correction. The legacy Session screen remains separate and is not
dual-written.

The status states are: Ready to sync, Syncing, last-synced time, Offline with
locally retained changes, **Waiting to retry** with a deferred Event count and
admission reason, and Events needing attention after permanent server
rejection. Deferred work never appears as synced. **Sync now** remains
available without blocking data entry and immediately retries deferred work
even when its automatic backoff deadline is still in the future.

In development builds only, Home includes **Event Pipeline**. It groups local
Events by `command_id` and shows the rebuildable projection, outbound
queue/retry/cursor state, server receipts/rejections, and sync errors. It is not
present in production navigation.

### 0.2 Phase 31 default workflow

**Field Data** replaces the Collaboration Pilot label and is the only normal
field-data entry point. Normal
Session, Banding Record, Station/Net, People/roster, Session crew, and Band
Inventory screens read and write the shared Event-backed projection while
retaining offline-first save behavior and visible sync state. Membership
administration is intentionally absent from Field.

Legacy mutable routes remain unlinked pending the documented two-Station
acceptance; they neither receive Event-backed writes nor provide a normal-path
fallback. The acceptance result governs their later removal without a legacy
data migration.

Home also links to a focused **Data Manager** recovery screen for exporting or
restoring the active Workspace's immutable Event Bundle. It does not expose the
legacy mutable Data Manager; projection-backed browsing, import, and agency
exports are Phase 33 work.

All observational fields remain optional. Remove actions become role-aware
deactivation with explicit reactivation, preserve historical references, and
do not cascade-delete accepted Events. Managed, foreign, and unbanded Band
selection are explicit; unresolved inventory is shown as unresolved rather
than being converted to foreign. Band-allocation and duplicate-band-number
conflicts remain visible with a corrective action available to any active
Contributor.

The Event-backed Inventory tab receives a displayed prefix/suffix range with
optional size and type choices from the current Field code tables. Its overview
and list show derived status, intrinsic metadata, current species, deployment
and last-seen dates, and active encounter history. Contributors may correct
intrinsic facts or deactivate/reactivate the Band, and may jump from a history
row to correct the source Record; there is no Band-status editor.

The Banding Record Net picker lists active Nets for the selected Session's
Station. The Manage Nets effort screen and automatic `SessionNetLog`
initialization below describe the legacy workflow and do not ship on the Phase
31 Event-backed path.

---

## 1. Home Screen (Navigation Hub)

**Purpose:** Central entry point. All major workflows start here.

**Layout:**
```
┌─────────────────────────────────────┐
│         BirdNerd                    │
│                                     │
│  [Field Data]                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│  [Data Manager]                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│  [Event Pipeline]  (development)    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│  [Report Bugs / Feedback]           │
│  [About]                            │
│                                     │
│  Future: Photo Log, Addendums        │
└─────────────────────────────────────┘
```

Buttons are grouped with subtle dividers: **field activities** (Field Data and
recovery-only Data Manager), **diagnostics** (Event Pipeline in development
builds), and **meta** (Feedback and About). Field Data itself contains the
event-backed Session, Record, Inventory, and Admin configuration tabs.

| Button | Purpose | Leads To |
|--------|---------|----------|
| **Field Data** | Create, correct, synchronize, and inspect shared Event-backed Sessions, Records, inventory, and configuration | Field Data |
| **Data Manager** | Export or recovery-restore the active Workspace's immutable Event Bundle | Workspace Event Bundle |
| **Event Pipeline** *(development only)* | Inspect local Events, projections, queue/cursor/retry state, receipts, and errors | Event Pipeline |
| **Report Bugs / Feedback** | Send feedback via email | Email client |
| **About** | App version, credits, links | About Page |

### 1.1 Page Header (shared component)

All pages use a consistent `PageHeader` component for navigation:

- **Top-level pages** (Session List, Location List, People, Export): Birdhouse home icon (42px, from `icons/home-birdhouse.png`) on the left + page title
- **Sub-pages** (Session View, Location Detail, Person Detail, Banding Form): "← Back" link on the left + page title + birdhouse home icon (34px, dimmed) on the right

This ensures every page has a consistent way to return home, regardless of navigation depth.

**Accessibility:** The home button must include `alt="Home"` on the image, `aria-label="Home"` on the button element, and `title="Home"` for hover tooltip on desktop.

### 1.2 Cascade Delete Confirmation

> **Legacy mutable workflow:** Phase 31 replaces these destructive actions with
> deactivation/reactivation and does not cascade-delete immutable Events.

When deleting an entity that has dependent data, show a confirmation dialog that explains what will be deleted:

```
┌──────────────────────────────────────┐
│  Delete Session?                     │
│                                      │
│  This will also delete:              │
│  • 42 banding records                │
│  • 3 bander log entries              │
│                                      │
│  This cannot be undone.              │
│                                      │
│  [Cancel]  [Delete]                  │
└──────────────────────────────────────┘
```

Applies to: Session (→ records, bander logs), Location (→ nets), Person (→ bander associations). Always list the count and type of dependent records.

### 1.3 Collapsible Section

A reusable component for grouping optional fields. Header with title + chevron toggle. Collapsed by default. Tap header to expand/collapse.

```
┌──────────────────────────────────────┐
│  ▸ Weather @ Open                    │  ← collapsed
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  ▾ Weather @ Open                    │  ← expanded
│  Temp (°C)  [ 18  ]                 │
│  Wind       [ 3   ]                 │
│  Cloud %    [ 50  ]                 │
│  Precip     [ clear        ▾ ]      │
└──────────────────────────────────────┘
```

### 1.4 SearchableSelect / Combobox

Reusable dropdown component with two modes:
- **Select mode** (default): Type to filter, pick from list only. Used for WRP codes, etc.
- **Combobox mode** (`allowFreeText`): Type to filter suggestions OR enter arbitrary text. Used for Precipitation and other fields where common values exist but free text is also valid.

### 1.5 Soft-Required Fields

Fields marked "soft-required" are visually highlighted (e.g., subtle border or label indicator) but do not block saving. The form can always be submitted with partial data. Enforcement of required fields is deferred to the Validation phase (Phase 12).

### 1.6 Inline Validation Warnings

Validation warnings and errors display **inline below the relevant field**, appearing live as the user fills the form and persisting until the conflict is resolved. They do **not** block saving — the form is always submittable.

```
┌──────────────────────────────────────┐
│  Sex       [M ▼]                     │
│                                      │
│  Brood Patch  [3 - Heavy ▼]         │
│  ⚠ Sex=M conflicts with BP 3/4      │
│                                      │
│  Skull     [  ▼]                     │
│  ⚠ Skull required when aged by SK    │
└──────────────────────────────────────┘
```

**Styling:** Warning text in `color: #c0392b`, `font-size: 0.8rem`, preceded by a ⚠ icon. Displayed immediately below the field's input element, above the next field's label.

**Behavior:**
- Warnings evaluate live on every field change (not just on save)
- Multiple warnings can appear simultaneously on different fields
- Warnings do not prevent saving — partial/conflicting records are allowed
- Cross-field rules (e.g., Sex + BP) trigger on whichever field changes last

---

## 2. Banding Data Collection Form

**Philosophy:** Single scrollable form. Banders skip around freely (waiting for scale, pliers, ruler, master bander input). **No wizard.** All fields accessible at once.

**Form Structure (6 sections):**
```
┌──────────────────────────────────────┐
│  BirdNerd Banding Form               │
├──────────────────────────────────────┤
│                                      │
│  [ Save Record ] [ Cancel ]          │
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
│   ├─ Capture Time [net-check select]│
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
| **Band Number** | Dropdown + search (required) | Type to search inventory (FK to Band). Available and deployed bands shown (deployed = valid recapture target). Retired/destroyed excluded unless already on this record. On match, show band size + type + status chip for verification. "UNBANDED" option for unbanded birds. See Band Number Flow below. |
| **Capture Code** | Radio buttons (N, U, R, F, etc.) | Defaults based on band status. Restricted to valid options for selected band. |
| **Species** | Autocomplete combobox | Type common name → ALPHA code auto-populates (or vice versa). Matches against 1,323 species from BBL. |
| **Age** | Select | Options: U, L, HY, AHY, SY, ASY, TY, ATY. Makes How Aged optional if U. |
| **How Aged** | Select (19 codes) | BP, CC, CL, EG, EY, FB, FF, IC, LP, MB, MR, NA, NF, NL, NN, PL, RC, SK, OT. Only shown if Age ≠ U. "OT" requires note. |
| **Sex** | Radio buttons (M, F, U) | Makes How Sexed optional if U. |
| **How Sexed** | Select (11 codes) | BP, CC, CL, EG, EY, MB, NA, PL, TL, WL, OT. Only shown if Sex ≠ U. "OT" requires note. |
| **Molt fields** | Select (single letters/numbers) | Coded values per molt tables in CodeTable. |
| **Morphometrics** | Number inputs | Wing/Tail in whole mm. Tarsus/Culmen/Other in ##.## precision. Mass in ##.# g. Validation: soft warnings if outside species range. |
| **Status** | Select | 300, 301, 318, 319, 333, 334, 380, 500, 700, "---" (Mortality), Other. 500 requires disposition + note. "---" requires note. |
| **Capture Time** | Net-check select | Lists 30-minute slots from the selected Session's opening through closing time. A bounded field-day window is used when those times are absent, and an existing off-cadence projected value remains selectable for inspection or correction. |
| **Release Time** | Time picker w/ buttons | "Now" button populates current device time (HH:mm). "✕" button clears the field. |
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

### 2.3 Recapture Fields (Phase 13b)

When Capture Code = R, a collapsible section auto-opens directly below the Capture Code field:

| Field | Type | Notes |
|-------|------|-------|
| **Present Condition** | Select | Condition at recapture (healthy, injured, dead, etc.) |
| **Replaced Band #** | Text input | If old band was worn/damaged and replaced — enter old band number |

**Behavior:**
- Section auto-opens when Capture Code = R (including when auto-set by band lookup detecting a deployed band)
- Changing Capture Code away from R hides the section
- On save: recapture field values are **discarded** if Capture Code ≠ R (not persisted)

### 2.4 Photo Capture Flow

Triggered from within a banding record. Photos are stored as blobs in IndexedDB; the filename is also saved for external reference.

1. **User taps "Add Photo"** at the top of the banding record form
2. **System sheet appears** via `<input type="file" accept="image/*">` — user chooses "Take Photo" or "Choose from Library"
3. **Photo review modal appears** showing:
   - The captured image (preview)
   - Auto-generated filename (updates live as body part changes): `DAY_LOCCODE_BANDID_SPECIESCODE_BODYPART.ext`
     - Banded example: `2026-03-22_GCFS_1154-81501_SOSP_WING.jpg`
     - Unbanded example: `2026-03-22_GCFS_UNBANDED003_SOSP_WING.jpg` (003 = record sequence in session)
     - Extension derived from uploaded file type (jpg, png, heic, etc.)
   - Body part chip selector: WING, TAIL, HEAD, BODY, BAND + "Other..." for free text
4. **User taps "Save to Drive"**
   - Mobile: `navigator.share({ files: [namedFile] })` → native share sheet → user picks Google Drive or other app
   - Desktop: falls back to file download with the auto-generated filename
   - After share/download completes, a `PhotoRecord` is automatically created
5. **Cancel / Retake** — user can dismiss the modal at any point

**Photo list on record:**
- After saving, a compact list of PhotoRecords appears at the top of the form (below the Add Photo button)
- Each row shows: body_part label + file_name (truncated) + delete button
- User can tap "Add Photo" again to add more; each creates a separate PhotoRecord
- New records (unsaved): photos held as "pending" until the record is saved

**Notes:**
- Offline: camera capture and naming work offline; share requires the target app to handle offline queuing (Google Drive does this)

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
| **Location** | Dropdown | Location table | Soft-required. Locked to one organization. |
| **Session Date** | Date picker | User input | Soft-required. ISO format (YYYY-MM-DD). |
| **Protocol** | Select | CodeTable | Soft-required. Options: MAPS, Non-MAPS, Burrowing Owl, Rehabbed-Bird, Saw-whet Owl, etc. |
| **MAPS Period** | Number input | User input | Optional. 1–10 if MAPS protocol. |
| **Open Time** | Time picker | User input | Soft-required. When nets opened. |
| **Close Time** | Time picker | User input | Soft-required. When nets closed. |
| **Master Bander** | Dropdown | Bander table, sorted by role | Soft-required. Dropdown shows: Master Banders first, then Sub-permittees, then Banders. Active only. |
| **Session Participants** | Multi-select checkboxes | Bander table, active only | Soft-required (≥1). Shows all active banders + their roles. Creates SessionBanderLog entries. |
| **Weather @ Open** | Collapsible section | Session table | Optional. Temp (°C), Wind (Beaufort 0-12), Cloud Cover (0-100%), Precipitation (combobox: type or pick from common values). |
| **Weather @ Close** | Collapsible section | Session table | Optional. Same fields as Weather @ Open. |
| **Notes** | Text area | User input | Optional. Session-level notes. |

**Weather sections** use a collapsible component — collapsed by default, expand on tap. Each contains 4 fields: Temperature, Wind, Cloud Cover, Precipitation. Precipitation uses a combobox (type free text or pick from suggestions: clear, fog, thick fog, drizzle, rain, snow).

**Linked Data:**
- Shows count of nets available at this location
- After saving, user can immediately start logging banding records
- Each banding record will reference this session

### 3.2.1 Session View (Record List)

After selecting a session, the Session View shows metadata summary, action buttons, and the list of banding records.

**Record rows:**
- Species code (bold), band number, capture code chip (if recap)
- Second line: age, sex, capture time, net
- Edit / Delete buttons on the right

**Recap chip:** Records with capture code `R` (recap) display a small "recap" chip — a grey rounded label (`background: #e9ecef`, `color: #6c757d`, `font-size: 0.7rem`) — inline after the band number. This provides at-a-glance differentiation from new bandings without cluttering the row.

### 3.3 Manage Nets (sub-page)

> **Deferred legacy design:** This dense `SessionNetLog` screen is not part of
> Phase 31. The active-Net picker remains; Net Hours will reconsider the effort
> model.

Accessible from the **Edit Session** form via a "Manage Nets" button (placed at the top, before the form fields). Uses the dense model: on session create, auto-generates a SessionNetLog entry for every active net at the location, pre-filled with session open/close times. Back button returns to Edit Session.

```
┌──────────────────────────────────────┐
│  ← Edit Session  Manage Nets  🏠     │
│                                      │
│  Session: 06:30–12:00                │
│  Total: 58.5 net-hours · 10 nets    │
│                                      │
│  [ Net 11 ▼ ] [ + Add Net ]         │
│                                      │
│  Net 1    06:30 – 12:00   5.50h     │
│  Net 2    06:30 – 12:00   5.50h     │
│  Net 3    06:30 – 11:00   4.50h     │
│           Closed early: wind         │
│  Net 4    07:00 – 12:00   5.00h     │
│           Opened late: low temps     │
│  ...                                 │
│                                      │
│  Tap a net row to edit times/remarks │
└──────────────────────────────────────┘
```

**Behavior:**
- Each row shows net label, open/close times, calculated net-hours
- Rows with remarks show the remark below in smaller/dimmed text
- Tap a row to expand inline edit: open time, close time, remarks (free text)
- Inline edit includes a "Remove" button to remove the net from this session's effort log
- Net-hours auto-calculated: `(close - open)` in decimal hours
- Total net-hours shown at top, updates live as times change
- Nets are sorted by label (numeric sort where possible)
- Only active nets from the location are auto-generated on session create
- **Add net:** Dropdown of active nets not already in the session + "Add Net" button. New log is pre-filled with session open/close times.
- **Remove net:** Available in the inline edit view. Confirmation required. Removes the SessionNetLog entry (does not deactivate the net itself).

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
│  ├─ Size 0A:  420 avail | 380 depl  │
│  ├─ Size 1:   380 avail | 450 depl  │
│  ├─ Size 1B:  250 avail | 270 depl  │
│  └─ ...                              │
│                                      │
│  [ View All Bands ] [ Add Bands ]    │
└──────────────────────────────────────┘
```

### 4.2 Band List View

| Column | Content | Filterable |
|--------|---------|------------|
| **Band #** | e.g., `1154-81501` | Yes (search) |
| **Size** | BBL code (0, 0A, 0B, 1, 1A, 1B, 1C, 1D, 2, 3, 3A, 3B, 4, 7, 7A, 7B, 8, 9) | Yes (select) |
| **Type** | Standard, Buffy, Giant, Lockout | Yes (select) |
| **Status** | available, deployed, destroyed, lost, replaced | Yes (select) |
| **Current Species** | ALPHA code (if deployed) | Yes |
| **Deployed Date** | ISO date | Yes (date range) |
| **Actions** | [View] [Edit] [Retire] | — |

### 4.3 Band Detail View (Phase 19)

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
│  Size: [1A ▼] (BBL size code)        │
│  Type: [Standard ▼] (select)         │
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
│  🔴 Galindo Creek    │
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
| **Name** | Text | Display name (e.g., "Galindo Creek") |
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

## 6. People

### 6.1 People List View

```
┌──────────────────────────────────────┐
│  People                              │
│                                      │
│  HD  Hallie Daly                     │
│      Master Bander · Active          │
│                                      │
│  JW  Julie Woodruff                  │
│      Sub-permittee · Active          │
│                                      │
│  TS  Tatyana Soto-Bartzi            │
│      Sub-permittee · Active          │
│                                      │
│  [ + Add Person ]                    │
└──────────────────────────────────────┘
```

### 6.2 Person Detail / Edit

| Field | Type | Notes |
|-------|------|-------|
| **Initials** | Text (2-3 char) | Used in banding records and session logs |
| **Full Name** | Text | Display name |
| **Active** | Toggle | Inactive people hidden from dropdowns |

**Roles section (within person detail):**
- Bander role: assign role (Master Bander, Sub-permittee, Bander, Trainee)
- Future: additional role types (Extractor, Data Entry, Scribe, etc.)

---

## 7. Data Manager

### 7.0 Overview

Phase 31's Home-reachable Data Manager is a focused **Workspace Event Bundle**
recovery screen. It validates container integrity, every Event, and the target
Workspace before touching local data; requires active access to that Workspace;
protects unsynced Events; and only then replaces, rebuilds, and catches up
through authenticated sync. It does not mount the legacy mutable Data Manager.

```
┌──────────────────────────────────────┐
│  🏠 Data Manager                     │
│                                      │
│  ── Workspace Event Bundle ───────── │
│                                      │
│  Immutable Workspace Event Log       │
│  + optional rebuildable cache         │
│                                      │
│  [ ↓ Export Event Bundle ]           │
│  [ ↑ Restore Event Bundle ]          │
│                                      │
│  ⚠ Validate Workspace; protect       │
│    unsynced Events before replace.    │
└──────────────────────────────────────┘
```

### 7.1 Data Manager Layout

The Phase 31 Data Manager contains only Workspace Event Bundle recovery. Restore
exposes its validation, access, and unsynced-Event protection result before the
destructive confirmation. There is no record browsing or filtering;
record-level views are accessed through the Session list.

See § 7.0 wireframe above for the full layout.

### 7.2 Agency Export Formats (Phase 33)

The Event-backed replacement is deferred to Phase 33. The intended formats are:

**IBP (MAPS master list)** — 50 columns matching Hallie's MASTER sheet. Includes both IBP and BBL code columns. All records (new bandings, recaptures, destroyed, unbanded).

**BBL Upload** — 58 columns per BBL spec. New bandings only (Code = N/1). IBP codes translated to BBL equivalents. `how_obtained` defaults to "Mist net".

**BBL Recapture Upload** — 60 columns per BBL spec. Recaptures only (Code = R, F, 4, 5, 6, 8). Adds `How Obtained`, `Present Condition` columns. `how_obtained` defaults to "Mist net".

The Phase 33 implementation will query Event-backed projections (not the Event
Bundle) and support Session or all-Session scope.

---

## 8. Accessibility & Mobile Design

- **iPhone/iPad first:** All screens tested at 375px width (iPhone SE) and 768px (iPad)
- **Touch targets:** All buttons ≥44px × 44px for easy tapping
- **Keyboards:** Numeric inputs show numeric keyboard; time pickers use native mobile time inputs
- **Offline:** All screens work without network connection
- **Orientation:** Support both portrait (primary) and landscape (future)

---

## 9. Future Screen Ideas

- **Photo Log** — Browse records with photo references, grouped by session (backlog)
- **Datasheet Addendums** — Field notes, special observations, protocols
- **Band History** — Click a banded bird → show all previous encounters
- **Session Summary** — End-of-day report + effort calculation
- **Data Sync Status** — Show pending changes waiting to upload
