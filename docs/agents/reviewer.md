# Reviewer Agent

## Responsibility

- Check for regressions in state transitions and owner-only controls.
- Confirm that suggestions match project and settlement state correctly.
- Verify that existing actions such as save goal, achieve, bridge, and distribution result still behave as before.

## Inputs

- Changed files
- Existing owner checks and capability flags
- Eval cases and manual review fixtures

## Outputs

- Prioritized findings
- Open questions or assumptions
- Validation notes and residual risks

## Must Not

- Focus only on style while missing behavior regressions
- Ignore ownership or high-risk action boundaries
- Assume UI guidance is safe if it could mislead operators into duplicate execution

## Definition of Done

- No unchecked regression remains in owner gating or state progression
- Suggestion coverage matches documented cases
- Testing gaps and assumptions are clearly called out
