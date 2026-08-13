---
name: phase-delivery
description: Deliver an explicitly requested BirdNerd roadmap phase or similarly scoped feature autonomously through a review-ready GitHub pull request. Use when the request includes implementation, appropriate automated and manual testing, durable interface documentation, an independent review with responses, and a useful PR handoff.
---

# Phase Delivery

Deliver a complete, review-ready increment—not merely compiling code. An
explicit request to use this skill authorizes creating a branch, committing the
phase work, pushing it, and opening/updating its PR. It never authorizes
merging, deploying, deleting user data, or declaring a roadmap phase complete.

## 1. Establish the delivery contract

1. Read `AGENTS.md`, the requested issue or phase in `docs/plan.md`, and the
   relevant product, technical, UX, domain, and architecture documents. When
   the request names a bare `#n`, resolve it as a PR first and then an issue as
   directed by `docs/agents/issue-tracker.md`; when it is an issue, fetch its
   comments before treating it as scope. Read the current working tree, recent
   history, and existing PRs before deciding what needs to change.
2. Record `git status --short` and the intended changed-path set before
   branching. Preserve unrelated working-tree changes: do not stage them or
   represent them in the PR. If their relationship to the requested work cannot
   be established safely, stop and ask.
3. State a concise implementation contract in the PR draft or working notes:
   user outcomes, non-goals, changed public interfaces/data, risks, and the
   test layers needed. Use the issue for requested scope, but follow the
   documented source-of-truth hierarchy: `plan.md` for current roadmap scope,
   specs for behavior, and `CHANGELOG.md` for shipped history. Surface a
   mismatch before implementing it; update a spec when behavior changes it.
4. Make reversible, low-risk decisions autonomously and record material ones
   in the PR. Stop only for a genuinely blocking ambiguity, an unsafe or
   irreversible data/security decision, missing credentials or authority, or a
   conflict with an existing user change.
5. Use applicable project skills. In particular, use `$field-release` before
   any Field version, release, Field changelog, or Field phase-completion
   operation. For repo-only changes, follow the normal `CHANGELOG.md` policy
   without inventing an unrelated Field release. Use `$supabase` for any
   Supabase work and `$code-review` for the two-axis independent review
   described below. Honor each skill's approval gates.

### Keep long local work alive

For an expected long local run, mention the host-awake preflight in the first
status update. On a Mac, connect power and either turn on **System Settings →
Battery → Options → Prevent automatic sleeping on power adapter when the
display is off**, or run `caffeinate -i -t 14400` (**4 hours**) in a separate
Terminal. This default prevents idle system sleep while letting the display
turn off, then exits automatically after 4 hours; stop it earlier with Ctrl-C.
Do not close the lid or choose Sleep manually. Ask before starting a longer or
indefinite keep-awake process; it consumes power. Commit/push durable
checkpoints so an interrupted local session can resume safely.

## 2. Implement in reviewable increments

1. Work on a dedicated branch from the agreed base. Keep commits logical and
   describe the intent, not just the files changed.
2. Prefer small, direct modules with one clear responsibility. Do not add
   abstractions, configuration, or generality that the accepted scope does not
   need.
3. Keep bundled-entity and IndexedDB versioning, migrations, code tables, and
   other project invariants in sync with the change. Follow the repo's named
   policies rather than recreating them here.

### Document interfaces where readers need a contract

For every new or materially changed cross-module or consumer-facing type,
function, class, hook, component boundary, protocol, or persistent-data
contract whose semantics are not clear from its name and type, add or update
the nearest useful documentation. Explain the purpose and semantic contract,
not the obvious syntax. Include what applies:

- invariants and valid states;
- ownership, lifecycle, units, ordering, or time semantics;
- side effects, mutation, error, empty, and retry behavior;
- compatibility or migration obligations; and
- why the boundary exists when that is not apparent from its name.

Keep doc comments short enough to stay truthful. Improve a vague name or
module boundary instead of using a long comment to compensate. Keep the
product, technical, UX, entities, and architecture documents current when the
changed behavior belongs there.

## 3. Verify with the right evidence

Create a risk-based test plan before calling the work done. Test observable
behavior, not implementation details or a coverage percentage.

- Add unit tests for pure domain rules, parsing, validation, transformations,
  and edge cases.
- Add integration tests for persistence, migrations, import/export, adapters,
  and boundaries that can fail only when parts work together.
- Add focused browser/E2E coverage for a high-value user journey or a
  regression that requires UI interaction. Do not add brittle UI tests when a
  lower-level test proves the behavior better.
- Add a regression test for every bug fixed when it is practical. Exercise
  failure, empty, and offline paths when the feature can expose them.

Inspect the affected workspace scripts and CI configuration before selecting
commands; do not assume the root test command covers every package. Run every
relevant repository check, including `git diff --check`, lint, targeted tests,
the complete CI-compatible test suite, and production builds. Report
pre-existing or unrelated failures distinctly; do not conceal them.

Perform a manual acceptance walkthrough when the environment permits. Use the
production-like app path and verify the primary workflow plus meaningful edge
states. Do not claim a device, offline, or browser test was performed unless it
was actually performed. Record prerequisites, numbered steps, expected result,
and observed result in the PR; say plainly which environment-specific steps a
reviewer must run themselves.

## 4. Review the changed surface before requesting review

Inspect the complete diff and its surrounding call sites. Make a deliberate
maintenance pass for:

- stale comments, examples, documentation, links, and generated descriptions;
- names that hide domain meaning, units, state, ownership, or side effects;
- renamed concepts still present in search results or public documentation;
- duplicate logic, mismatched validation, dead branches, and accidental scope
  growth; and
- tests whose names or assertions no longer describe the behavior.

Limit cleanup to the changed surface and directly affected documentation unless
the user expands the scope. State intentional deferrals rather than leaving
misleading comments or TODOs.

## 5. Open a decision-useful PR

Push the branch and open or update a PR against the agreed base. Use the
repository PR template and make every section evidence-based; write `N/A —
why` rather than leaving a section blank. The PR must let a reviewer answer,
without reconstructing the work:

1. What changed for a user and why?
2. How does the design work, including material interfaces and decisions?
3. What automated checks passed, and what do they cover?
4. How can the reviewer reproduce the manual verification?
5. What was deliberately deferred or could not be verified?

Link the issue and phase/spec sources. Include screenshots or recordings when
a visual change is important to reviewing behavior. Never put secrets, local
paths, or unverified claims in the PR.

## 6. Obtain and answer an independent review

After the first complete PR is available, launch a fresh reviewer session that
did not implement the change. Give it only the base ref, head ref/PR, the
verified GitHub issue URL or number (or an explicit statement that none
exists), and the relevant specification paths; do not give it the author's
rationale or conclusions. Instruct it to resolve a bare `#n` reference as an
issue or PR using `docs/agents/issue-tracker.md`, then fetch the issue and its
comments when it is an issue. Have it inspect the complete diff and relevant
surrounding code.

Run `$code-review` in that independent session for its separate Standards and
Spec review. Also require the reviewer to consider correctness, missing or
wrong tests, interface-contract documentation, stale documentation/comments,
and naming on the changed surface. Findings must cite a file/line or a
requirement; absence of findings is a valid outcome.

As the author, answer every substantive finding in the PR:

- **Resolved:** link the commit or change and the validation evidence.
- **Not applicable:** explain the evidence-based reason.
- **Deferred:** create or link an explicit follow-up only when deferral is
  accepted and does not hide a release-blocking issue.

Fix all substantiated correctness, data-loss, security, and material usability
findings. Re-run affected checks. If the response materially changes design or
behavior, obtain one further independent review; otherwise do a final
self-review of the response and diff.

## 7. Hand off honestly

Leave the PR in a review-ready state. In the final report, give both:

- a plain-language explanation of what users gain and how to manually test it;
  and
- a technical explanation of the design, interfaces, test evidence, reviewer
  findings/responses, PR URL, and anything still requiring human approval.

Start with this exact kind of status line, adapted only for the actual state:
**Handoff state: review-ready PR — awaiting merge.** Explain that
implementation delivery is complete, but the roadmap phase is not complete and
no deployment has occurred. State the next decision in one sentence: for
example, "You can review and merge PR #123 yourself, or ask me to merge it if
authorized. If you say 'I merged,' I will do the Field release and
roadmap-completion bookkeeping." An unqualified user statement that they
merged is the explicit approval to perform that bookkeeping; do it promptly,
starting with "Handoff state: merged — doing release/roadmap bookkeeping now."
If their merge message includes a qualifier, follow it instead. Never make the
user infer whether a final report means "work finished," "waiting for review,"
or "fully released."

Do not merge, deploy, or mark the roadmap phase complete. For a Field phase,
wait for explicit approval before applying the release/roadmap-completion
decision required by `$field-release` and Roadmap Maintenance.
