# @birdnerd/sync-spike

Isolated spike app for Phase 23 — evaluating peer-to-peer sync for banding records.

This is **not** part of the field PWA. It lives in the monorepo only so it can share workspace tooling.

## Goal for 0.1.0

Prove that two browser tabs can sync a shared document via Yjs + y-webrtc with zero server infrastructure beyond a public signaling relay.

## Run locally

```bash
npm run dev:sync
```

Open `http://localhost:5173` in two tabs (or on two devices on the same internet), enter the same room code in both, and type in the textarea. Edits should appear in every peer within a second or two.

## Notes

- Uses the default public y-webrtc signaling servers (`wss://signaling.yjs.dev`, etc.). No data flows through them — they only broker WebRTC handshakes.
- Access is honor-system only at this stage. Anyone who guesses the room code can join. Identity/trust gating comes in Sync 0.3.0.
