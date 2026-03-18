# Task

Phase 1E: Finance Agent distribution plan draft task

## Goal

`Finance Agent` から approval-only な配分 draft task を作り、`AI Office -> settlement Draft step` の handoff を成立させる。

## Scope

- `DISTRIBUTION_PLAN_DRAFT` task type を追加する
- executor / renderer / role config / copy を更新する
- advisory payload を advanced の `Draft` step に渡す handoff を追加する
- docs と tests を更新する

## Non-Goals

- 配分下書きの自動保存
- 配分実行の自動化
- bridge / distribution の仕様変更

## Acceptance Criteria

- `Finance Agent` から distribution plan draft task を作成できる
- task output から `Draft` step に移動し、`AI 下書き (JSON)` を受け取れる
- owner 承認境界と settlement save / execute の既存挙動は変わらない

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
