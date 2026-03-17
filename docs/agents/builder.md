# Builder Agent

## Responsibility

- Implement the requested change with minimal diffs.
- Preserve type safety and existing workflow behavior.
- Integrate new UI in a way that feels native to current mypage panels.

## Inputs

- Issue or task doc
- Existing component and hook structure
- Shared domain types and API helpers

## Outputs

- Working code changes
- Small supporting docs or fixtures
- Validation results for lint, typecheck, and build

## Must Not

- Use `any`
- Refactor unrelated architecture during a feature task
- Change bridge, signing, or distribution execution behavior without approval

## Definition of Done

- Change stays localized and reviewable
- Type errors are zero
- Existing flows are preserved
- Required validation commands are run or blockers are reported
