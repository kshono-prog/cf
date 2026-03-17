# Next Action Cases

## Purpose

This document fixes the expected behavior for the first AI loop: deterministic next-action suggestions derived from project summary state.

## Cases

### 1. no goal

- Input state: `summary.goal` is `null`
- Expected suggestion: ask the creator to save a goal
- Priority: `high`
- Target: `goal`

### 2. below target

- Input state: goal exists and confirmed progress is below target
- Expected suggestion: recommend checking progress or strengthening promotion
- Priority: `medium`
- Target: `summary`

### 3. target reached but not achieved

- Input state: confirmed progress is at or above target and `goal.achievedAt` is `null`
- Expected suggestion: ask the owner to confirm achievement
- Priority: `high`
- Target: `achieve`

### 4. achieved but plan missing

- Input state: goal is achieved and `distributionPlan` is empty or missing
- Expected suggestion: ask the creator to save a distribution plan
- Priority: `high`
- Target: `plan`

### 5. bridge/distribution incomplete

- Input state: goal is achieved, plan exists, and bridge or distribution result is not reflected yet
- Expected suggestion:
  - if bridge is not reflected, recommend bridge preparation or execution check
  - if bridge is reflected but distribution result is not saved, ask for tx hash confirmation and result save

### 6. distribution already saved

- Input state: project already has a saved distribution result
- Expected behavior: do not suggest duplicate distribution result saving

## Review Notes

- Suggestions must be advisory only.
- Suggestions must stay under three items.
- `unknown` fields such as `distributionPlan` and `txHashes` must be checked with guards, not unsafe casts.
