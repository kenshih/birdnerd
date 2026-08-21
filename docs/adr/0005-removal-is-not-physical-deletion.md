# Routine removal retains immutable history

**Status:** superseded in part by
[ADR 0017](0017-operational-workspace-authority.md)

BirdNerd will model routine deletion as authorized deactivation or removal
events that preserve event history and referential context. Normal
application operations will not physically delete shared data; exceptional
privacy or legal erasure will be a separately governed process.

ADR 0017 supersedes this record's Admin-only authorization detail: active
Contributors may deactivate/reactivate ordinary operational data, while
configuration and Membership lifecycle authority remain restricted.
