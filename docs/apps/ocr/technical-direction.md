# BirdNerd OCR Technical Direction

This note captures the OCR-engine options considered for BirdNerd OCR and the current implementation direction for `0.4.x`.

Roadmap sequencing stays in [../../plan.md](../../plan.md). This document is for technical rationale, constraints, and pivot criteria.

## Current Product Constraints

- Support one known BirdNerd bandsheet layout first
- Keep the existing row-by-row review workflow as the center of the product
- Keep human review mandatory
- Prefer a narrow experiment before committing to a larger OCR architecture
- Ask before adding dependencies

## Options Considered

### 1. Tesseract.js in the Browser

Why it is attractive for BirdNerd now:

- Fits the current browser-first OCR app architecture
- Can run directly against the existing row-based review flow
- Keeps the first experiment small and local
- Gives us a quick way to test whether OCR signal is useful on this bandsheet layout

Important limitations:

- `tesseract.js` wraps the Tesseract engine in WebAssembly rather than changing the underlying recognition model
- The project explicitly notes that it does not improve core Tesseract accuracy
- Handwriting quality may therefore be the real ceiling for this path
- Tesseract's own quality guide emphasizes preprocessing and notes that tables and visible cell borders can interfere with recognition, which is directly relevant to BirdNerd bandsheet rows

Primary references:

- Tesseract.js README: <https://github.com/naptha/tesseract.js>
- Tesseract.js site: <https://tesseract.projectnaptha.com/>
- Tesseract Improve Quality guide: <https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html>

### 2. Cloud OCR APIs

Why this remains a plausible fallback:

- Cloud document OCR services are stronger candidates if handwriting quality is not good enough with a browser-first engine
- These services can return richer document structure and confidence metadata

Current examples reviewed:

- Google Cloud Vision `DOCUMENT_TEXT_DETECTION`, which Google documents as suitable for dense documents and handwriting
- Azure AI Document Intelligence Read, which Microsoft documents as extracting printed and handwritten text from scanned images and PDFs

Tradeoffs:

- Online dependency
- Authentication and billing overhead
- More infrastructure work before the OCR experiment becomes usable inside BirdNerd

Primary references:

- Google Cloud Vision handwriting OCR: <https://docs.cloud.google.com/vision/docs/handwriting>
- Azure AI Document Intelligence Read: <https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read?view=doc-intel-4.0.0>

### 3. Heavier OCR / Document Parsing Toolkits

Why they are not the first `0.4.0` choice:

- Toolkits like PaddleOCR are promising for document parsing and skewed/scanned documents
- They are more likely to pull BirdNerd toward a service-side or Python-assisted architecture sooner
- That is heavier than needed for the first viability test

Primary reference:

- PaddleOCR docs home: <https://www.paddleocr.ai/main/en/index.html>

## Decision For 0.4.x

BirdNerd OCR should start `0.4.x` with a Tesseract-first experiment.

This is a product decision about sequence, not a permanent commitment to Tesseract as the final OCR architecture.

For the roadmap, see [../../plan.md](../../plan.md). The technical direction for that roadmap is:

- Introduce `tesseract.js` first
- Run OCR against the current row-based review flow
- Treat the first integration as a viability spike rather than a permanent architecture commitment
- Keep human review mandatory
- Treat field-level OCR, not generic row-level OCR, as the more promising near-term path for this bandsheet layout

Success means:

- We can OCR row crops in-browser
- We get enough useful text fragments to prefill some existing row fields
- The workflow still centers human review rather than trusting OCR output

Failure signals that should trigger a rethink:

- Recognition quality on real row crops is too weak to prefill anything useful
- Performance or memory cost in-browser is unacceptably bad
- The integration requires so much preprocessing that the browser-first path stops being the simple option

## Current Design Notes

- Tesseract is currently acceptable as the near-term OCR engine for BirdNerd, provided we keep the workflow human-in-the-loop and constrained to this one bandsheet layout.
- Early testing suggests full row OCR with visible gridlines is weak, while tighter word- or character-level crops are materially better.
- The likely path to useful quality is:
  - tighter field-level segmentation within each reviewed row
  - field-specific OCR settings such as page segmentation mode and character whitelists
  - light preprocessing where needed
  - postprocessing against known code/value constraints
  - confidence-aware review cues such as yellow/red highlighting for low-confidence results
- This means BirdNerd probably does not need to "solve handwriting OCR in general" to get useful results. It needs to get good enough at one layout with bounded field types and human review.
- If future experimentation shows Tesseract cannot get beyond weak usefulness even with field-level constraints, preprocessing, and postprocessing, then we should reconsider cloud OCR or heavier document-parsing alternatives.

## Manual Transcription Exercise

A useful design exercise was to manually transcribe a real sheet into a CSV and pay attention to the steps involved.

The most important result was that the work did not feel like "reading a row" in one pass. It felt more like:

1. Find structural landmarks in the row
2. Isolate a small field or cell group
3. Use field expectations to interpret ambiguous marks
4. Move to the next field

That reinforces the current direction, but with a clearer product framing:

- BirdNerd OCR should behave like a structured transcription assistant, not a generic row OCR engine
- The useful unit of work is often a field or a single cell, not a whole row
- The row template and field windows are not just OCR helpers; they are the backbone of the workflow

This exercise increased confidence in the following design choices:

- Grid-aware or template-aware segmentation is the right foundation
- Species alpha code is a strong grouped-field OCR target
- Band number likely wants per-cell OCR rather than one grouped digit run
- Human review plus confidence-aware cues is still the right product posture

It also surfaced a promising extension to the current path:

- The product may eventually benefit from a lightweight per-sheet calibration step
- That would mean aligning the known row template to one sheet once, then reusing that structure across many rows
- This is a different problem from generic table detection and may be both simpler and more reliable for BirdNerd

Practical implication:

- The right near-term problem is not "OCR the row"
- It is "navigate a known row template and generate field-level suggestions with constraints, review cues, and human confirmation"

## Explicit Non-Goals For 0.4.x

These are intentionally deferred so `0.4.x` stays focused on OCR viability:

- Image-rotation and intake polish
- Replacing native `datalist` with a custom compact combobox
- Direct BirdNerd import from OCR output
- General multi-layout document support

Those belong in later polish or follow-on OCR phases unless they become necessary to make the OCR experiment viable.
