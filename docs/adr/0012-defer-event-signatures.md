# Event signatures are deferred from the first collaboration release

The first collaboration release will rely on Supabase-authenticated Event
Admission and recorded actor provenance rather than cryptographically signing
every Domain Event. The envelope will leave room for future signatures, but
device-key lifecycle and member-key distribution will be designed only when a
P2P adapter becomes a concrete requirement.
