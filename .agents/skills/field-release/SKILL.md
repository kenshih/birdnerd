---
name: field-release
description: Prepare, version, validate, and optionally commit or push a BirdNerd Field app release. Use when a Field release, version bump, changelog entry, phase completion, release bookkeeping, or the question "are the version numbers right?" is requested.
---

# Field Release

Treat a version as a release claim. Reconcile the planned phase with the code
that actually ships before changing version numbers or release trackers.

## Establish the release decision

1. Read `AGENTS.md`, the current `docs/plan.md` entries, `CHANGELOG.md`, and
   `apps/field/package.json`.
2. Inspect `git status`, recent `git log`, and the working-tree diff. Do not
   overwrite unrelated user changes.
3. State the evidence: current Field version, proposed version, and which
   planned outcomes the diff does and does not implement.
4. If the target version or whether the phase is complete is unclear, ask
   before editing. A phase-numbered version does not by itself prove phase
   completion. If the user deliberately chooses a version that represents a
   narrower slice, record the shipped scope accurately.

## Update release metadata before committing

Make the release updates as one working-tree change, before the feature commit
is created:

- Set `apps/field/package.json` to the approved Field version.
- Synchronize the `apps/field` version in `package-lock.json` using the normal
  npm workflow; do not hand-edit unrelated lockfile entries.
- Add a concise Field-version entry under `[Unreleased]` in `CHANGELOG.md` for
  user-visible behavior, version, or repo-structure changes.
- Update the relevant product, technical, and UX specifications when the
  shipped behavior changes them.
- Update `docs/plan.md` only when the user agrees the phase is complete:
  mark it complete, update the `Now` line, and keep the completion description
  truthful. Archive completed plan material when the existing plan structure
  calls for it.
- Update `MEMORY.md` `Current Phase` and `Completed Phases` if the file exists
  and the phase has completed.
- Bump the bundle schema and add a migration only when bundled entity fields
  are added, removed, or renamed. Bump IndexedDB only for store/index changes.

Keep credentials, `.env.local`, and provider secrets out of commits.

## Validate and hand off

1. Review `git diff --check`, the full staged diff, and `git status`.
2. Run `npm run build`; run `npm run lint` and `npm test` when the change can
   affect those checks. Report any pre-existing or unrelated failures plainly.
3. Confirm the built app reports the intended version.
4. Do not commit, tag, push, or deploy unless the user explicitly asks. If
   asked, commit only the reviewed files and push only the requested branch.
5. If a release was already committed or pushed with wrong metadata, make a
   transparent corrective follow-up commit. Do not rewrite shared history
   unless the user explicitly requests it.

## Required final report

Report the Field version, validation results, phase-tracker state, commit and
push status (if any), and any intentionally deferred phase outcomes.
