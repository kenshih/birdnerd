# Supabase is the first shared backend behind a BirdNerd sync adapter

BirdNerd will use Supabase Auth and Postgres for the first collaborative
release, with row-level authorization based on Workspace Membership. A
BirdNerd-owned Sync Adapter will push and pull immutable Domain Events while
keeping the domain model and projections provider-independent. Clients rebuild
their own projections; server-side projections are optional rebuildable query
caches, not authoritative write models. PowerSync and RxDB are deferred
because the current IndexedDB PWA and custom event model do not need their
additional client-database abstraction yet.

Supabase's only domain-facing responsibility is Event Admission: it verifies
the sender's active Workspace Membership and a submitted event's workspace,
identity, and envelope/schema before append. It does not reconcile objects or
apply business projections.
