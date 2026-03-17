# Task

Phase 1B: distribution plan draft を AI 下書きとして追加する

## Goal

達成後の配分 plan JSON を、人間がレビューできる draft として生成できるようにする。

## Scope

- summary と settlement context から draft builder を追加する
- `draftPayload` または同等の構造を定義する
- plan editor に draft を流し込む導線を追加する
- docs と tests を更新する

## Non-Goals

- 配分の自動保存
- 配分の自動実行
- 資金移動判断の自動化

## Files Likely Affected

- `lib/creator-ai/nextActionSuggestions.ts`
- `lib/creator-ai/`
- `components/mypage/ProjectSettlementPanel.tsx`
- `components/mypage/ProjectSettlementDistributionDraftSection.tsx`
- `docs/specs/creator-ai-office/task-output-contracts.md`

## Acceptance Criteria

- plan draft を生成できる
- creator が保存前に JSON を確認・編集できる
- 既存の `canSavePlan` と owner 境界を壊さない

## Risks

- draft の shape が distribution 実行と混同される可能性
- purpose / allocation が未整備な project で曖昧な draft が出る可能性

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- plan draft 生成から手動保存までの確認
