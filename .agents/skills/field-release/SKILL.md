---
name: field-release
description: Prepare, version, validate, and optionally commit or push a BirdNerd Field app release. Use when a Field release, version bump, changelog entry, phase completion, release bookkeeping, or the question "are the version numbers right?" is requested.
---

# Field Release

Treat a version as a release claim. Reconcile the planned phase with the code
that actually ships before changing version numbers or release trackers.

## Establish the release decision

1. Read `AGENTS.md`, [Roadmap Maintenance](../../../docs/repo/roadmap-maintenance.md),
   the current `docs/plan.md` entries, `CHANGELOG.md`, and
   `apps/field/package.json`.
2. Inspect `git status`, recent `git log`, and the working-tree diff. Do not
   overwrite unrelated user changes.
3. State the evidence: current Field version, proposed version, and which
   planned outcomes the diff does and does not implement.
4. If the target version or whether the phase is complete is unclear, ask
   before editing. A phase-numbered version does not by itself prove phase
   completion. If the user deliberately chooses a version that represents a
   narrower slice, record the shipped scope accurately.

## Update release metadata before committing or opening a Field-phase PR

For an agreed Field phase/version, make the version, lockfile, changelog, and
specification updates on the delivery branch before the PR is opened. This
lets reviewers assess the release claim with the implementation. Make them as
one working-tree change before the feature commit is created when possible;
if implementation already landed without them, add a transparent corrective
commit before review/merge. Do not defer these three release metadata files to
post-merge bookkeeping.

Keep the following post-merge: `docs/plan.md` completion/archive changes,
tags, deployment, and any statement that the release is shipped. After merge,
reconcile the reviewed proposed version with the merged code before marking
the roadmap phase complete.

Prepare the pre-merge release metadata as follows:

- Set `apps/field/package.json` to the approved Field version.
- Synchronize the `apps/field` version in `package-lock.json` using the normal
  npm workflow; do not hand-edit unrelated lockfile entries.
- Add a concise Field-version entry under `[Unreleased]` in `CHANGELOG.md` for
  user-visible behavior, version, or repo-structure changes.
- Update the relevant product, technical, and UX specifications when the
  shipped behavior changes them.
- Update `docs/plan.md` only when the user agrees the phase is complete; follow
  [Roadmap Maintenance](../../../docs/repo/roadmap-maintenance.md) for the
  status, rolling-archive, and **Current**-marker steps. Add the phase outcome
  to the existing twenty-phase archive (normally `plan.v1` for Phases 1–20,
  `plan.v2` for Phases 21–40) rather than creating a new `plan.vN` file for a
  release or a small batch. Keep the active plan to one concise row per
  archive range; put release versions, patch detail, evidence, and unfinished
  task lists in the changelog, archive, specifications, or backlog instead.
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

## Make the handoff state explicit

Start every final report with one bold, plain-language status line. Do not use
"complete" by itself when the implementation is done but a user decision is
still required. Use the state that matches the evidence:

- **Handoff state: prepared locally — awaiting your instruction to commit or
  push.** The changes and validation are ready, but no shared Git state changed.
- **Handoff state: review-ready PR — awaiting merge.** The delivery work is
  complete; the user may merge the PR themselves or ask the agent to merge it
  when authorized. It is not a deployed release or a completed roadmap phase.
- **Handoff state: merged — doing release/roadmap bookkeeping now.** For a
  Field phase, an unqualified user statement such as "I merged" authorizes the
  remaining in-repository release and roadmap-completion bookkeeping. Say this
  status line, then proceed without asking again. If the user adds a qualifier
  (for example, "I merged, but…"), follow that direction instead. Do not infer
  authority to deploy, tag, or perform an unrelated external action.
- **Handoff state: complete.** Use only after every action the user requested
  for this release has actually occurred.
- **Handoff state: blocked — awaiting <specific decision or authority>.**
  Name the exact thing the user needs to decide or provide.

When a next action is optional, say so explicitly: for example, "You can
review and merge now. If you say 'I merged,' I will do the remaining
release/roadmap bookkeeping." Keep implementation completion separate from
merge, deployment, and roadmap-completion authority.

## Required final report

Report the explicit handoff state first, then the Field version, validation
results, phase-tracker state, commit and push status (if any), and any
intentionally deferred phase outcomes.
