# Roadmap Maintenance

This guide maintains BirdNerd's versioned roadmap documents. It applies to all
workspaces; use the project-specific `$field-release` skill for the additional
Field release and versioning steps.

## Document responsibilities

| Document | Owns | Does not own |
|----------|------|--------------|
| [plan.md](../plan.md) | Current phase, upcoming phased work, and the unscheduled backlog | Full shipped-change history or detailed completed-phase scope |
| [CHANGELOG.md](../../CHANGELOG.md) | Shipped, user-visible, versioned, or meaningful repo/deployment changes | Future work or an open-task list |
| [plan archives](../archives/) | Durable scope and outcome summaries for completed phases or completed sub-phases | The current roadmap or a duplicate release narrative |
| App specs | The behavior and design that currently exist | Roadmap ordering or historical release notes |

`docs/plan.md` is repo-level: identify the affected app or package when a
phase is not repo-wide. Its **Current roadmap** is strictly ordered, has
exactly one phase marked **Current**, and keeps completed work limited to a
compact archive index.

## Establish status from evidence

Before declaring a phase or sub-phase complete, reconcile the tracker with:

1. The working tree and relevant diff.
2. Recent Git history.
3. Relevant workspace `package.json` version(s) and lockfile state.
4. `CHANGELOG.md` and the applicable specifications.

Treat phase numbers and version numbers as evidence, not proof. If the planned
outcome, shipped scope, or completion decision is unclear, flag the mismatch
and ask before changing status. This is especially important when work was
done outside the current session.

## Update the active roadmap

For normal planning changes:

- Keep phases in **Current roadmap** in execution order. Mark exactly one
  phase **Current**; it is the first phase in that section.
- Add, re-scope, reorder, or retire future work in `plan.md` without putting
  it in the changelog.
- Put durable behavior decisions in the relevant product, technical, UX, or
  architecture document, then link to them from the roadmap as needed.
- Keep unscheduled ideas in the backlog. Do not create a completed-phase entry
  for work that is merely planned or partially implemented.

## Complete a phase or sub-phase

Do this only after the user agrees the phase is complete and the evidence above
supports the claim:

1. Make the release, version, changelog, and specification updates required by
   the changed scope. For Field releases, follow `$field-release`.
2. Add a durable completed-scope and outcome summary to the applicable rolling
   `docs/archives/plan.vN.md` file. Do not create a new archive for an
   individual phase or small batch of phases.
3. Update `plan.md`: remove the completed detail, update the single compact
   archive-range row in **Archived roadmap history**, and move the **Current**
   marker to the next phase.
4. For a partially completed long-running phase, archive only the completed
   sub-phases and leave the unfinished work in its backlog. Label a superseded
   path explicitly rather than implying it is complete.
5. Review the diff for accurate links and wording; run the relevant validation
   for the release or code change. A documentation-only maintenance change at
   minimum needs `git diff --check`.

## Archive conventions

- Use a rolling archive for roughly twenty numbered phases. `plan.v1.md`
  covers Phases 1–20; `plan.v2.md` covers Phases 21–40. Start `plan.v3.md`
  only when the first completed phase is beyond Phase 40, then continue with
  the next twenty-phase range. Use phase numbers, rather than release count or
  archive age, to choose the range.
- Append the completed phase or sub-phase to its existing rolling archive. An
  archive is a concise durable record of scope, decisions, and outcome—not a
  per-release changelog, test report, or pilot transcript. Link to the
  changelog, specifications, ADRs, issues, or runbooks for that detail.
- Keep the active plan's **Archived roadmap history** to one terse row per
  archive: archive name, covered phase range, and a link. Do not add a new
  row for each recent phase, release version, patch, pilot, or unfinished
  sub-phase.
- Preserve unfinished goals and assumptions in a separately labelled backlog.
  From the archive index, link to the archive only; do not summarize the
  remaining task list there. Its phase number does not alter the execution
  order of **Current roadmap**.
- When an archive boundary is reached, compact repeated wording while retaining
  the outcome and durable decision for each phase. Verify every historical
  archive link after the rotation or consolidation.

## Related references

- [Agent instructions](../../AGENTS.md) — source-of-truth policy and working
  conventions.
- [Field release workflow](../../.agents/skills/field-release/SKILL.md) —
  Field versioning, validation, and release metadata.
- [Contribution guide](../../CONTRIBUTING.md) — concise contributor-facing
  plan/changelog distinction.
- [Monorepo documentation scope](monorepo.md) — ownership of repo-level and
  app-level documentation.
