# Event bundles replace mutable entity snapshot bundles

BirdNerd backup/export will use an Event Bundle containing a container manifest
and the Workspace Event Log, rather than arrays of mutable entities under one
global domain-schema version. Event types retain their independent versions;
any included projection snapshot is an optional rebuildable cache, never the
authoritative restore source.

V1 restore is limited to recovery: replace a local replica, rebuild it from the
bundle, then synchronize through normal authenticated admission. It protects
unsynced local events and explicitly defers history merge/adoption.
