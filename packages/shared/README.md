# Shared Package

This workspace contains shared BirdNerd domain types and other app-agnostic logic.

Phase 21c establishes the first real shared surface by moving persisted domain types here.

Current contents:
- shared entity and record types consumed by the field app
- shared banding code metadata consumed by the field and OCR apps

Still intentionally out of scope:
- React/UI code
- IndexedDB logic
- PWA/service worker config
- routing and app state
