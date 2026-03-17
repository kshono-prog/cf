# Task

Phase 1D: agent usefulness metrics を追加する

## Goal

Phase 1 の agent output が実際に役立っているかを判断できる最低限の metrics を持つ。

## Scope

- approval / rejection / ignored の計測方針を定義する
- 既存 audit または dashboard read に乗せられる指標を追加する
- docs に metric 意図と読み方を追記する
- tests を追加する

## Non-Goals

- フル BI ダッシュボード
- 外部 analytics 基盤の追加
- 課金メトリクスの実装

## Files Likely Affected

- `lib/agentTaskAudit.ts`
- `app/api/ai-office/dashboard/route.ts`
- `docs/specs/creator-ai-office/overview.md`
- `docs/specs/creator-ai-office/ai-office-x402-rollout.md`

## Acceptance Criteria

- approval / rejection / follow-through を最低限追える
- Phase 2 prioritization に使える指標が決まる
- schema 変更が必要なら別承認タスクに分離される

## Risks

- 指標だけ増えて意思決定に使えない可能性
- event 定義が曖昧だと継続比較できない可能性

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- dashboard read の手動確認
