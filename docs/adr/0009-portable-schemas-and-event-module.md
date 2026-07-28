# Portable schemas and a dedicated event module own event contracts

Top-level `schemas/` will hold the language-neutral Event Contract source of
truth. A new `@birdnerd/events` package will generate and expose TypeScript
types plus create/decode/validate/upcast behavior, hiding code-generation and
versioning details behind a small Interface. `@birdnerd/shared` retains its
generic shared-domain role; projectors and reducers remain outside the event
module.
