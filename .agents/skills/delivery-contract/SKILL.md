---
name: delivery-contract
description: Establish or refresh a decision-ready delivery contract in a GitHub Issue before implementing a BirdNerd roadmap phase or complex feature. Use when a user asks to scope or plan a delivery, a phase needs clarification, or work adds or materially changes a Module, Seam, Adapter, persistent-data contract, authorization rule, synchronization/protocol, external provider, or cross-package behavior. Used by $phase-delivery when its design gate applies; skip for a small, well-specified local change.
---

# Delivery Contract

Turn an intended delivery into a bounded, decision-ready plan before implementation. The GitHub Issue owns the working contract; ADRs and specifications own durable decisions and shipped behavior.

## 1. Decide whether to use this skill

Use this skill when the work:

- begins a roadmap phase or a complex feature;
- introduces or materially changes a Module, Interface, Seam, or Adapter;
- changes persistent data, authorization, synchronization, a protocol, or an external provider; or
- lacks a decision-ready issue contract.

Skip it for a small, well-specified local change with no material Interface or data-contract impact. Record a concise implementation contract directly in the PR for that work.

## 2. Establish the factual context

1. Read `AGENTS.md`, the roadmap entry, the relevant issue and its comments, current working tree, recent history, and applicable product, technical, UX, entity, domain, and architecture documentation.
2. Resolve the delivery's GitHub Issue under `docs/agents/issue-tracker.md`. If it does not exist, create it before treating the contract as established.
   For a roadmap phase, add or refresh a compact `Delivery contract: #<issue>`
   link in that phase's `docs/plan.md` entry. The roadmap remains the scope and
   sequencing source; the Issue owns the working contract, so do not copy the
   contract into the roadmap.
3. Reconcile discrepancies instead of silently choosing one source. `docs/plan.md` owns current scope, ADRs own accepted architecture decisions, specifications own behavior, and `CHANGELOG.md` owns shipped history.
4. When the delivery touches a documented provider, apply its project skill. In particular, use `$supabase` for Supabase design or implementation work.
5. Identify the delivery's real **manual expectations**: account or dashboard configuration, credential custody, trusted-operator steps, approval gates, migration deployment, and pilot or release participation. Distinguish prerequisites, operator duties, and manual acceptance scenarios; omit generic checklists and say `None known` when no human action is required.
6. Prompt for manual prerequisites that cannot be established from the repository, connected systems, or durable documentation. Ask one narrow, actionable question when the delivery depends on a user-held credential, account setting, approval, named pilot participant, or other external action. Record the answer in the Issue; do not mark the delivery ready while a required prerequisite remains unconfirmed. Do not ask the user to reconfirm a documented fact or to perform a routine future step that does not affect delivery shape.

## 3. Design the changed surface

When the delivery creates or reshapes a Module, Interface, Seam, or Adapter, use `$codebase-design` before recording the contract. State:

- the Module and the Interface callers must learn;
- the Seam and each Adapter's responsibility;
- Interface invariants, ordering, errors, retry/empty behavior, ownership, and compatibility obligations as applicable; and
- the reason this shape has leverage and locality, including alternatives where they materially differ.

Do not create a hypothetical provider seam merely to be generic. When an established ADR already settles the decision, follow it and link it; do not reopen it without evidence. Capture a consequential, durable decision in the appropriate ADR or specification and link it from the contract.

## 4. Write the Issue contract

Create or update a `## Delivery contract` section in the Issue. Keep it concise and decision-useful:

```markdown
## Delivery contract

### Outcomes
-

### Non-goals
-

### Changed surface
- Modules / Interfaces / Seams / Adapters:
- Persistent-data or public-contract compatibility:

### Decisions and open questions
- Settled: ADR/spec link — decision
- Open: question, options, and consequence of delaying it

### Manual expectations
- Confirmed: account, credential, dashboard, or operator prerequisites established from evidence or user response
- Needs user confirmation: prerequisite, why it blocks readiness, and the one action or decision required
- During pilot or release: human actions and observable result

### Risks and acceptance evidence
- Risk — mitigation / test layer
- Manual or pilot scenario — observable success condition
```

Do not duplicate the roadmap, ADRs, or specifications. Link to those sources and use the Issue to show the delivery-specific connections, choices, risks, and evidence.

## 5. Collaborate only on material choices

Make reversible, low-risk choices and record the rationale. Ask the user one narrow question when a decision is unsafe, irreversible, security- or data-loss-sensitive, or represents two materially different delivery shapes. Present the competing options, the recommended option, and the consequence of deferring the choice.

Do not ask merely because the contract is incomplete: resolve factual gaps from the sources first.

## 6. Hand off cleanly

Report the Issue URL, the contract's unresolved decisions, the manual expectations (including any confirmation still required, or `None known`), and whether the delivery is ready for `$phase-delivery`. Do not create a branch, implement, open a PR, merge, deploy, or mark a phase complete. `$phase-delivery` carries a ready contract through delivery and reproduces the final design and verification evidence in the PR.
