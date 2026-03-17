# ADR-002 AI Office x402 Staged Rollout

## Context

Creator Founding already has the operating skeleton needed for creator support workflows: `Project`, `Goal`, `Summary`, `Achieve`, `Bridge`, and `Distribution`. AI Office also exists as an approval-based task system. The next product direction is to grow toward role-based agents and, later, machine-billable APIs with x402.

## Decision

Adopt a staged rollout:

- first expand AI Office through role-based advisory and draft-producing agents
- then define internal x402 candidate surfaces only for low-risk intelligence or draft generation
- keep all funds movement, bridge, distribution execution, and goal confirmation outside automated x402 flows

## Why

- existing creator workflows are already rich enough to support advisory agents
- x402 fits billable analysis or drafting surfaces better than high-risk settlement actions
- preserving approval boundaries keeps the product aligned with existing safety rules
- staged rollout reduces the chance of mixing monetization experiments into fragile financial flows

## Alternatives

- implement x402 directly on settlement or distribution flows
  - rejected because it introduces monetization and automation risk into high-risk operations
- add broad generic agents without role boundaries
  - rejected because it weakens ownership and review expectations
- delay all x402 thinking until much later
  - rejected because internal boundaries and catalog decisions are cheaper to make now

## Follow-ups

- keep role metadata and x402 candidate surface metadata in code
- add tests around safe and unsafe billable surfaces
- define metrics for agent usefulness before external API rollout
- revisit external MCP or marketplace exposure only after internal operator adoption
