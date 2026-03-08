# Tasks

## Current Focus

- Lock Phase 0 UX information architecture before adding more operator-facing UI
- Apply the new UX language and primary CTA rules across existing surfaces
- Refine `AI Office` after the new `Overview / Create / Inbox` split
- Keep AI Office and settlement changes aligned with user-facing language, not internal task names
- Continue using small Issue-sized tasks so Codex can implement UX changes safely

## Active Tracks

### UX Foundation

- define screen purpose and primary CTA for public page, mypage, AI Office, and settlement
- completed: terminology and status-copy rules now exist in docs and are applied to AI Office / settlement
- completed: shared notice / empty-state pattern now reaches `AI Office`, `settlement`, and key `mypage` views
- keep docs/specs as the source of truth before UI refactors

### Settlement UX

- completed: `settlement` now follows a guided `Bridge -> Draft -> Preflight -> Execute -> Review` structure
- completed: `CCTP` and `manual result` are now treated as advanced controls, while `execution logs` remain in the main review flow
- next: hand-check whether the new guided flow feels natural in real creator operations

### AI Office

- completed: `AI Office` now has `Overview / Create / Inbox` level separation
- completed: task-type select has been replaced with action cards in `Create`
- completed: `Inbox` now prioritizes `承認待ちキュー -> 一括操作 -> 最近の履歴`
- completed: `Overview / Create / Inbox` now share success / empty / error display patterns
- completed: approval-required work is now visible from `Overview`, `Create`, and `Inbox`
- next: decide whether AI Office needs a stronger guided flow or is sufficient after manual review

### Onboarding

- completed: registration and creator apply now read as one continuous flow
- completed: `NoUser`, `UserOnly`, and early `creatorReady` now show current step or daily-work entry
- next: refine section labels and CTA hierarchy so user-facing language wins over internal grouping

### Repository Automation

- standardize Issues and PRs through `.github`
- use Codex for UX task triage, implementation, and review in bounded scopes
- keep CI as the hard gate for merge quality

## Ready Queue

1. Write Phase 0 UX spec for screen purpose, CTA priority, and terminology
2. Hand-review `settlement`, `mypage`, and `AI Office` after the new guided flow / shared feedback pattern
3. Decide whether `settlement` needs a stronger stepper or is sufficient with the current guided layout
