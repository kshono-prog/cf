# Task

AI Office: manual check findings を Phase 1 UX polish に反映する

## Goal

minimum / full manual check で見つかった文言や導線の違和感を、`1 Issue = 1 PR` で小さく解消するための polish task を切り出せる状態にする。

## Scope

- manual check artifact から findings を収集する
- `copy / CTA / notice / role guidance / settlement handoff` の違和感を分類する
- high-risk 変更を除いた Phase 1 UX polish 候補を優先順に並べる
- 必要なら追従 task を 1 finding = 1 task で追加する

## Non-Goals

- manual check 自体を代行すること
- bridge / distribution / wallet behavior の変更
- Phase 2 機能を前倒しで追加すること

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/notes.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/status.md`
- `/Users/shounokazuaki/cf/docs/roadmap/backlog.md`
- `/Users/shounokazuaki/cf/TASKS.md`
- `/Users/shounokazuaki/cf/docs/tasks/todo/*.md`

## Acceptance Criteria

- manual check findings が `copy / information hierarchy / handoff / approval flow` などに整理されている
- 次に直す task が reviewable な粒度で切れている
- high-risk 変更は別扱いだと明記されている

## Risks

- findings をまとめすぎると 1 PR の差分が大きくなる
- screenshot だけで原因を決め打ちすると、実装側の責務を誤認しやすい

## Validation

- artifact review
- backlog / TASKS の更新差分レビュー
- follow-up task の粒度確認

