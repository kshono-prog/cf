# Tasks

## Current Focus

- Lock Phase 0 UX information architecture before adding more operator-facing UI
- Apply the new UX language and primary CTA rules across existing surfaces
- Strengthen the public profile so first-time visitors can understand and support quickly
- Keep the public profile in a consistent light theme and explain why supporting here is safe
- Stabilize `AI Office` after Phase 1 delivery and manual-check preparation
- Keep AI Office and settlement changes aligned with user-facing language, not internal task names
- Continue using small Issue-sized tasks so Codex can implement UX changes safely

## Active Tracks

### UX Foundation

- define screen purpose and primary CTA for public page, mypage, AI Office, and settlement
- completed: terminology and status-copy rules now exist in docs and are applied to AI Office / settlement
- completed: shared notice / empty-state pattern now reaches `AI Office`, `settlement`, and key `mypage` views
- completed: public profile now puts a support hero and wallet CTA above supporting content
- completed: public profile now shows detailed goal/progress before the wallet section again, while keeping the fold focused
- completed: wallet section now explains the support flow in steps and prioritizes network, currency, amount, then send
- completed: public profile now uses a more consistent light-tone surface system across header, goal, video, wallet, and footer
- completed: support hero and goal/progress now live in one surface, and the footer styling has been restored
- keep docs/specs as the source of truth before UI refactors

### Settlement UX

- completed: `settlement` now follows a guided `Bridge -> Draft -> Preflight -> Execute -> Review` structure
- completed: `CCTP` and `manual result` are now treated as advanced controls, while `execution logs` remain in the main review flow
- completed: `settlement` now reduces mobile density by stacking step cards, form actions, and review rows on small screens
- next: hand-check whether the new guided flow feels natural in real creator operations, especially on mobile

### AI Office

- completed: `AI Office` now has `Overview / Create / Inbox` level separation
- completed: task-type select has been replaced with action cards in `Create`
- completed: `Inbox` now prioritizes `承認待ちキュー -> 一括操作 -> 最近の履歴`
- completed: `Overview / Create / Inbox` now share success / empty / error display patterns
- completed: approval-required work is now visible from `Overview`, `Create`, and `Inbox`
- completed: `Manager Agent` recommendation can now be saved as an `AgentTask`
- completed: `Finance Agent` can hand advisory distribution draft payloads to `settlement Draft`
- completed: AI Office is now explained and navigated through `Manager / Promotion / Finance / Fan Relation`
- completed: usefulness metrics, role filters, deep links, recent shortcuts, and copied role links now support the guided flow
- completed: `Promotion Agent` announcement drafts can now hand off to `support-page` posting compose while `Fan Relation Agent` keeps a copy-only boundary
- completed: `minimum` manual check can now prepare `notes / links / status` artifacts and run one-shot smoke preflight
- next: run the minimum/full manual check on real screens and use those findings to decide the first Phase 2 UX adjustments
- next: turn manual-check findings into small polish tasks instead of one large UX catch-all

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
2. Run the `AI Office` minimum manual check and record capture-backed findings
3. Hand-review `settlement`, `mypage`, and `AI Office` after the new guided flow / shared feedback pattern
4. Extend `AI Office` usefulness from approval tracking to posting / settlement follow-through
