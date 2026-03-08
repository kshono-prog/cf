# Task

Phase 2 UX: `AI Office` の Inbox hierarchy を整理する

## Goal

`AI Office` の Inbox で、ユーザーが `今すぐ判断が必要なもの` と `後から見返す履歴` を迷わず区別できるようにする。

## Scope

- Inbox を `承認待ちキュー -> 一括操作 -> 最近の履歴` の順に並べ替える
- 承認待ち件数と履歴件数を first view で把握できるようにする
- 承認待ちに集中する表示と履歴表示の切り替えを user-facing copy に揃える

## Non-Goals

- 承認フロー API の変更
- AI Office 全面リデザイン

## Files Likely Affected

- `components/mypage/AiOfficeInboxSection.tsx`
- `components/mypage/AiOfficePanel.tsx`
- `PROJECT_STATE.md`
- `TASKS.md`
- `docs/roadmap/backlog.md`

## Acceptance Criteria

- Inbox を開いたとき、承認待ちキューが最初に見える
- 一括操作が履歴一覧と分離されている
- 履歴は `後から見返す領域` として下段に整理されている

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `components/mypage/AiOfficeInboxSection.tsx` を `承認待ちキュー / 一括操作 / 最近の履歴` の3層に整理した
- `components/mypage/AiOfficePanel.tsx` は filtered list を持たず、Inbox 側で hierarchy を組み立てる構成に寄せた
- `docs/specs/ux/phase0-phase1-roadmap.md` に Inbox hierarchy の方針を追記した
