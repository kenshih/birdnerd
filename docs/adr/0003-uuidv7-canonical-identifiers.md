# UUIDv7 is the canonical identifier scheme

BirdNerd will generate UUIDv7 identifiers locally for every persistent
Workspace-owned entity and Domain Event. The collaboration release starts with
UUIDv7 data rather than migrating existing identifiers. UUIDv7 supports
independent offline creation without collisions while retaining useful
chronological ordering; human-facing operational codes remain separate domain
fields.

Reference: [RFC 9562 — Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html).
