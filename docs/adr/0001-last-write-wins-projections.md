# Last-write-wins projections retain immutable conflicting changes

BirdNerd will retain every submitted change as immutable history, but derive a
single current-state projection using deterministic field-level
last-write-wins when two changes affect the same field. Changes to different
fields compose, while every competing change remains in history. This supports
practical concurrent field use at two stations without silently discarding the
provenance needed to inspect or correct a result later.
