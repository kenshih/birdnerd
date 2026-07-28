# The Banding domain module owns pure field-work semantics

`@birdnerd/banding` will own BirdNerd's pure banding commands, validation,
event decisions, and deterministic projection reducers. It depends on
`@birdnerd/events` but not on React, IndexedDB, Supabase, sync, or network
code, allowing the same field-work rules to be tested and reimplemented across
platforms.
