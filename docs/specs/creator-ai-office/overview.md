# Creator AI Office Overview

## 目的

クリエイターの運営実務を、`提案 -> 承認 -> 実行` の流れで支援する。

## ユーザー価値

- 今やるべきことが分かる
- 投稿、告知、翻訳、報告の下書きがある
- 支援状況と活動状況を同時に見られる
- 低リスクな定常業務を AI に任せられる

## コアフロー

1. 活動データと支援データを集める
2. AI が分析、提案、または `Manager Agent` recommendation task を作る
3. クリエイターが task を承認または差し戻す
4. 承認済み task を限定的に実行する
5. 結果を履歴として保存する

## v1 の対象

- `ANALYZE`
- `MANAGER_NEXT_ACTIONS`
- `PROPOSE`
- `TRANSLATE`
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`

将来の段階計画:

- role-based `Manager / Promotion / Finance / Fan Relation` agent へ広げる
- x402 は low-risk な analysis / draft API のみ候補にする
- 詳細は `docs/specs/creator-ai-office/ai-office-x402-rollout.md`
- Phase 1 実行計画は `docs/specs/creator-ai-office/phase1-delivery-plan.md`

## v1 の対象外

- 完全自動投稿
- 金銭移動の自動決定
- 外部サービスへの全面自動連携
