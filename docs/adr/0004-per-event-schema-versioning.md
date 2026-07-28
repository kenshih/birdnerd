# Domain Events version independently by type

Every Domain Event will carry an event type and a schema version for that type.
Incompatible changes create a new version while historical events remain
decodable or are upcast during replay; BirdNerd will not use a single global
event-schema version because independent event types evolve at different
rates.
