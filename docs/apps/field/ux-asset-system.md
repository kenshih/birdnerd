# Field UX Asset System

This guide keeps Field's user-experience documentation, visual examples, and
browser evidence coherent as the app evolves. It is the canonical organization
guide for those assets; it does not replace the product, technical, or UX
specifications.

## Asset map

| Asset | Owns | Does not own |
| --- | --- | --- |
| [UX specifications](ux-specifications.md) | The current user-visible behavior, field-wide interaction rules, and concise critical-workflow contracts | Repeated component layouts, phase history, or a future-work list |
| Storybook (local, when introduced) | Executable visual examples of real reusable production components and their meaningful states | Business rules, durable data behavior, or end-to-end workflow proof |
| Playwright | Real user journeys, visible outcomes, and integration behavior through the running Field app | A browsable component catalog or pixel-perfect design approval |
| Product and technical specifications | Product scope and architecture | A duplicate visual presentation contract |
| Plan, changelog, ADRs, and Git history | Future work, shipped history, durable architecture decisions, and historical detail | The current UX contract |

## Critical workflow contracts

The UX specification keeps a short card for each critical user workflow. A
card names the user goal and deterministic starting state, shows the important
before → action → result states, records visible promises and relevant
non-visible invariants, and links to its Storybook example (when useful) and
Playwright proof.

A pure rule test is never sufficient proof for a visible requirement. For
example, a validation rule and an inline warning are separate obligations: the
former needs a direct rule test and the latter needs user-visible evidence in
the rendered Field flow.

## Change rules

- When a critical visible behavior changes, update its workflow card and its
  relevant browser evidence. Update its Storybook example when the component
  presentation or state changes.
- When introducing a new critical workflow, define its card before declaring
  the work complete. Keep the card concise and link rather than restating
  supporting specifications.
- When a behavior is deferred or retired, record its replacement or retirement
  destination in the roadmap or delivery contract, then update affected cards
  and examples so they do not imply it still ships.
- When a reusable visible state needs human design review, prefer extending an
  established production component and its story over creating a new visual
  pattern.

## Simplicity guardrails

- Stories render production components and production styling. Do not create
  Storybook-only components, rules, or visual styling.
- Add a story only for a reusable visual contract or a state that a reviewer
  must inspect. Do not catalog every page, prop permutation, or one-off
  wrapper.
- Storybook remains a local development and review tool. It is not a deployed
  third app, a second end-to-end test system, or a screenshot-diff release
  gate.
- Keep domain decisions in their responsible modules. Storybook may supply a
  displayed state, but it does not decide when a validation warning, access
  outcome, or sync state exists.
- Prefer the existing Field theme and components. Do not introduce a generic
  design system, token layer, or configurable component framework unless a
  separately scoped need proves one necessary.

## Maintenance approach

The existing UX specification is consolidated gradually, not rewritten in one
documentation-only project. As a current behavior receives a workflow card or
Storybook example, remove duplicated layout detail and move phase history to
the appropriate historical source. Preserve still-current interaction rules.

Before changing visible Field behavior, read this guide with the applicable UX
specification. The repository instructions link here so this convention stays
available to future maintainers and agents.
