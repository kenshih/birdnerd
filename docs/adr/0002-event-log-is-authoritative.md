# The event log is the authoritative collaboration write model

For collaborative BirdNerd data, typed immutable Domain Events will be the
durable source of truth and entity tables will be rebuildable Current-State
Projections. We reject a mutable-table-plus-revision-log bridge because it
would make the initial sync architecture diverge from the model needed for
provenance, deterministic conflict handling, and future collaboration.

The collaboration release begins with a clean Event Log because there is no
production BirdNerd data to preserve; test and initial-hydration data will be
recreated as valid events.
