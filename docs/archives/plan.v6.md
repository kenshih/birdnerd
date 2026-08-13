# BirdNerd — Plan (archived v6)

Completed sub-phases of **Phase 22 — Bandsheet OCR** and **Phase 23 — P2P Sync Spike**, archived out of the active [plan.md](../plan.md) once shipped. Goals/assumptions for each phase remain in the active plan alongside their unfinished sub-phases.

> **Historical versioning note:** Field 0.23.0 was intentionally skipped.
> When made, Field release minor versions track global phase numbers. Phase 23
> was a Sync spike rather than a Field release; the next Field release was
> 0.24.0.

---

## Phase 22 — Bandsheet OCR (completed sub-phases)

### OCR 0.2.0 — Sheet Review & Row Preparation ✅
- Support one known bandsheet layout only
- Upload image files of bandsheets
- Establish OCR-specific branding assets from the new media/logo work
- Add simple image rotation for slightly tilted sheet photos
- Manual entry of sheet/header metadata for now
- Detect or manually define row regions
- Show full sheet plus per-row crop view
- Review one row at a time
- Allow row geometry refinement before transcription
- No structured row data entry yet
- No BirdNerd import yet
- Initial implementation slices: upload image + full sheet viewer; manual row definition/adjustment; selected row crop + next/previous navigation

### OCR 0.3.0 — Core Row Data Model & Review UX ✅
- Begin structured row transcription after sheet/row geometry is in place
- Define OCR-app row draft schema for the first supported field subset
- First-pass subset: bander's initials, code, band number, species alpha code, age, how aged, WRP code, sex
- Add row status flow: unreviewed, in progress, reviewed
- Add next/previous row workflow
- Add a selected-row draft editor tied to each manual row box
- Preserve image-to-row context while editing

### OCR 0.3.1 — Row Review Workflow Polish ✅
- Continue the structured row review workflow after the first editable draft milestone
- Polish row editing and review interactions based on real usage
- Reorganize the row editor into left / middle / right sections that roughly mirror the physical row
- Keep short coded fields visually compact, especially in the left-hand section
- Expand the left-hand draft fields to cover the remaining short-coded row cells before moving deeper into middle/right sections
- Confirm and fix row-selection/draft persistence edge cases discovered during testing
- Evaluate layout refinements for preview, controls, and row list placement with desktop-first testing

### OCR 0.3.2 — Export & Guided Entry ✅
- Add CSV/table export for reviewed rows
- Add export preview table for non-empty row drafts before download
- Keep export logic modular via a pure export utility and dedicated preview component

### OCR 0.3.3 — Cleanup & Structure ✅
- Centralize OCR row draft field schema so draft initialization, editor layout, and CSV export share one source of truth
- Refresh OCR workspace copy so the UI reflects the current review-and-export workflow
- Keep the displayed OCR version derived from `package.json` / `__APP_VERSION__`
- Remove the nested-button annotator pattern and preserve keyboard focus/selection for row boxes

### Shared 0.2.0 — OCR/Field Metadata Foundation ✅
- Extract reusable field metadata from OCR into `packages/shared` where it is clearly domain-level rather than app-local
- Define shared enum-like/code-list structures for constrained banding fields that both field app and OCR app can consume
- Keep the shared package focused on pure metadata/types/helpers, not OCR UI behavior
- Use this shared layer to support the first field-aware OCR inputs without duplicating code tables or option definitions

### Field 0.22.0 — Shared Metadata Adoption ✅
- Adopt the shared banding code metadata from `@birdnerd/shared`
- Keep current field-app behavior unchanged while the source of truth for constrained code tables moves into the shared package
- Verify field build and regression tests after the shared extraction

### OCR 0.3.4 — Guided Entry Inputs ✅
- Add the first field-aware inputs where useful: combobox/select/code helpers for constrained fields
- Start with constrained banding fields such as code, species alpha code, age, sex, how aged, and how sexed
- Reuse shared metadata from `packages/shared` where practical instead of hardcoding OCR-only option lists
- Use native `datalist` as the lightweight first guided-input step; consider a custom compact one-line combobox later if browser rendering remains too noisy
- Continue confirming and fixing any row-selection/draft persistence edge cases discovered during testing
- Keep refining the row-review workflow now that export and the left-side coded layout are in place

### OCR 0.4.0 — OCR Engine Integration ✅
- Introduce the first OCR engine/library for the supported bandsheet workflow
- Start with a Tesseract-first browser experiment and treat it as a viability spike rather than a permanent architecture commitment
- Run OCR against the current row-based review flow rather than a separate pipeline
- Keep the initial OCR scope narrow and prove that browser-based OCR is viable for this layout
- Keep human review mandatory
- Revisit cloud OCR or heavier document-parsing options only if Tesseract quality or browser performance is not good enough
- Initial implementation slices: dedicated OCR service/module; run OCR on the selected row crop only; add a `Run OCR on This Row` action with visible progress/error state; show raw OCR text for inspection; try first-pass prefill for a very small field subset such as band number, species alpha code, age, sex, and code
- Current learning: generic row-level OCR is weaker than focused field-level OCR on this grid-heavy layout, so the next steps should bias toward tighter field windows and constrained recognition

### OCR 0.4.1 — OCR Row Prefill ✅
- Prefill draft values into the existing row editor from OCR output
- Focus on the current constrained left-side field set first
- Surface OCR output in a way that fits the existing row-by-row review workflow
- Continue measuring OCR usefulness on real bandsheet examples
- Shift from generic row OCR toward focused field-level OCR where the layout and value constraints are predictable
- Start with species alpha code and band number experiments using tighter field windows and field-specific OCR constraints
- Initial implementation slices: define layout-specific field windows within the selected row; crop species code and band number subregions from the selected row; run field-specific OCR presets on those subregions; keep raw field OCR results visible; prefill only `speciesCode` and `bandNumber` when the suggestions are usable
- Current learning: grouped species-code OCR is already promising with template-driven field windows, while grouped band-number OCR likely needs per-cell OCR in the next tuning pass

---

## Phase 23 — P2P Sync Spike (completed sub-phases)

### Sync 0.1.0 — Scaffold & Yjs Baseline ✅
- Create `apps/sync-spike` workspace in monorepo
- Integrate Yjs + y-webrtc
- Two browser tabs sync a shared Yjs document
- Room identified by a shared code/password for now
- No banding record shape yet — just prove sync works

### Sync 0.2.0 — Banding Record Shape ✅
- Model field app's capture record shape in Yjs (`Y.Map` per record)
- CRUD operations (add, edit, delete) sync across peers
- Test with real banding data shape across two devices
