# Command groups favor liveness and eventual convergence

Commands may emit independently appendable Domain Events correlated by a
`command_id`; retries are idempotent and projectors must tolerate partial
arrival before converging on replay. BirdNerd will not require universal
transactional multi-event admission, preserving offline/P2P liveness. A true
invariant may instead use one semantic event or an explicitly designed atomic
operation.
