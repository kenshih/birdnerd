# YAML-authored JSON Schema defines portable event contracts

BirdNerd will author language- and transport-neutral Event Contracts in YAML,
using a deliberately restricted JSON Schema 2020-12 subset, and use JSON for
the initial transport encoding. TypeScript types and runtime validators will
be generated from that contract; Protobuf or Avro may become derived encodings
when a concrete need arises, but neither will be a second source of truth.
