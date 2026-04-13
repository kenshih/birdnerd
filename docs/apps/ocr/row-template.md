# BirdNerd OCR Row Template Notes

This note captures the currently known left-side row structure for the primary supported BirdNerd bandsheet layout.

It exists so we can tune row-relative/grid-aware OCR windows without relying on memory or re-asking for the same layout description later.

## Source Images

- Empty-row reference: `docs/media/last.empty.row.jpg`
- Filled-row reference: `docs/media/hummingbird.row.jpg`
- Full-sheet context: `docs/media/banding.sheet.2026.01.23.sheared.jpeg`

Notes on the empty-row reference:

- It is a variant of the sheet
- The 3rd column shows `U` in this example, whereas that column is often empty until a banding code is written
- Some later columns show `0` where they would often be empty
- The important structural grid is otherwise the same
- The image shows both the left-most and right-most table borders and a partial empty row above it

## Current Scope

This note only captures the left-side columns we need for the current OCR work.

The right-side columns can be added later instead of trying to document the entire sheet at once.

## Left-Side Row Structure

Ordered from left to right:

1. Bander initials
- 2 cells
- one letter per cell

2. Banding code
- 1 cell
- examples: `R` recap, `N` new, `U` unbanded

3. Band number
- 9 cells
- one digit per cell
- no hyphen on the sheet

4. Written species
- 1 wide cell
- currently outside the OCR capture focus, but may be added later

5. Species alpha code
- 4 cells
- one letter per cell

6. Age
- 1 cell

7. How aged
- 2 cells
- only the right cell is normally used

8. WRP code
- 4 cells total
- the first cell may be empty, but can sometimes contain `M`
- the right 3 cells are the ones most often used
- there is a visually unusual internal vertical divider here worth preserving in any row template/grid model

9. Sex
- 1 cell

10. How sexed
- 2 cells
- only the right cell is normally used

11. Skull
- 1 cell

12. Cl. Prot.
- 1 cell

13. Br. Patch
- 1 cell

14. Fat
- 1 cell

15. Body Mlt.
- 1 cell

16. FF Molt
- 1 cell

17. FF Wear
- 1 cell

18. Juv Bdy Pl.
- 1 cell

## Design Implications

- The first OCR path should move toward a scalable row-grid model rather than loose percentage windows.
- Several important fields are truly cell-based, not freeform text regions.
- `bandNumber` and `speciesCode` are especially strong early OCR targets because they are bounded by clear repeated cells.
- `howAged` and `howSexed` are asymmetric 2-cell fields where the right cell matters most.
- `wrpCode` needs slightly richer handling than a simple equal-cell group because its first cell behaves differently from the right 3 cells.
- The written species column is a separate wide text region and should remain optional for now.

## Open Follow-Up

- Add the remaining right-side columns later
- Convert this note into a machine-friendly row template when we are ready to encode the grid formally in TypeScript
