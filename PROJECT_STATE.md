# Project State

最終更新: 2026-03-07

## 現在のテーマ

- 中核プロダクトを `クリエイター向けAI事務所` に寄せる
- ただし当面の提供価値は `承認付き半自動運営` に限定する
- 開発運用も同じ思想で、`監督付き半自動開発` に揃える

## 現在のプロダクト定義

このプロジェクトは、クリエイターの活動・支援・運営タスクをまとめて扱う基盤である。

現在の本命領域:

- Creator profile / public page
- Project / Goal / Contribution
- Settlement / Distribution
- AI task (`ANALYZE`, `PROPOSE`, `TRANSLATE`)

現在の実験領域:

- AI Office の拡張
- Metrics 収集と分析
- Gas support
- Event 機能
- Bridge / CCTP の運用強化

## 直近2週間の目標

1. AIエージェント開発運用のための文書基盤を整える
2. `AgentTask` を AI事務所の中核モデルとして明確化する
3. `app/[username]/mypage/AccountPageClient.tsx` の責務を分割する
4. lint error を解消し、最低限の静的チェックを通す

## 進行中の重点課題

- 画面責務が `AccountPageClient` に集中している
- API と UI の仕様が文書化されていない
- 機能は広いが、本命機能と実験機能の境界が薄い
- Git 上で未追跡の実装が多く、レビュー単位が粗い

## 既知の技術的負債

- `scripts/importSocialsAndVideos.cjs` が lint error の原因になっている
- 未使用変数と `<img>` 警告が多い
- `AgentTask` の task type が route 内分岐に寄っていて拡張しにくい
- settlement / bridge / distribution まわりの責務分離がまだ弱い

## 承認境界

AIが自動で進めてよい:

- 既存仕様内の実装
- リファクタ
- lint / type 修正
- docs 更新
- 非破壊な UI 改善

要承認:

- Prisma schema 変更
- migration 追加
- 新規 env var 追加
- 外部 API 追加
- 送金 / ブリッジ / 配分処理の仕様変更
- 依存ライブラリ追加

人が必ず担当する:

- 本番デプロイ
- 本番 env / 秘密鍵更新
- 資金移動判断
- 外部公開物の最終承認

## 次に着手するタスク

1. `docs/specs/creator-ai-office/agent-task-model.md` に沿って `AgentTask` の責務を整理
2. `docs/tasks/todo/2026-03-agent-task-refactor.md` を起点に task 分解
3. `docs/tasks/todo/2026-03-account-page-split.md` を起点に mypage 分割
4. lint error 解消タスクを切り出す

## 検証ポリシー

最低限必須:

- `npm run lint`
- `tsc --noEmit`

重要変更時:

- `npm run build`
- 変更対象画面の手動確認
- 変更対象 API の正常系 / 異常系確認

