# Task

Phase 0 UX: 用語と status / message 文言をユーザー向けに揃える

## Goal

内部実装の用語をそのまま露出しないようにして、task type、status、success/error/empty message のユーザー向け表現基準を定義する。

## Scope

- `AI Office` の task type 表示名を定義する
- `WAITING_APPROVAL / DONE / FAILED` の表示ラベルと補助文を決める
- success / error / empty state の文言ルールを決める
- 次の実装で置き換える優先箇所を列挙する

## Non-Goals

- すべての画面文言の一括変更
- 多言語対応

## Files Likely Affected

- `docs/specs/ux/phase0-phase1-roadmap.md`
- `components/mypage/AiOfficePanel.tsx`
- `app/[username]/mypage/AccountPageClient.tsx`
- `components/mypage/ProjectSettlementPanel.tsx`

## Acceptance Criteria

- task type のユーザー向け表示名一覧がある
- status の表示ルールがある
- message の書き方の原則がある
- 実装対象ファイルが次 task に落とせる

## Risks

- operator 向け情報まで隠しすぎる
- 文言だけ変わって構造の問題が残る

## Validation

- docs の差分レビュー
- 現行 UI 文言との対応表確認

## Result

- `lib/uxCopy.ts` を追加し、`AI Office` と `settlement` の task type / status / message / audit action の user-facing copy を集約した
- `components/mypage/AiOfficePanel.tsx` で task type 名、status 名、監査ログ action、指標や form label をユーザー向け表現に置き換えた
- `components/mypage/ProjectSettlementPanel.tsx` と settlement section 群で status badge、section title、message、実行結果の表示名をユーザー向け表現に置き換えた
