# Sync state is a generic event-replication coordinator

`@birdnerd/sync-state` will own local event-replication state and expose a
provider-independent coordinator Interface. It will use an internal transport
seam for a Supabase adapter first and a P2P adapter only when that is real.
The module exchanges and tracks Event Contracts but never owns banding
semantics, projections, or Field-PWA UI state.
