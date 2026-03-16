# Project State

最終更新: 2026-03-08

## 現在のテーマ

- 中核プロダクトを `クリエイター向けAI事務所` に寄せる
- ただし当面の提供価値は `承認付き半自動運営` に限定する
- 開発運用も同じ思想で、`監督付き半自動開発` に揃える
- 次の1か月は `整理 70% / 新機能 30%` で進める

## 現在のプロダクト定義

このプロジェクトは、クリエイターの活動・支援・運営タスクをまとめて扱う基盤である。

現在のMVP領域:

- Creator profile / public page
- Project / Goal / Contribution
- Settlement / Distribution
- AI task (`ANALYZE`, `PROPOSE`, `TRANSLATE`, `WEEKLY_REPORT`, `ANNOUNCEMENT_DRAFT`)
- AI task 基盤の拡張 (`validator / schema / executor registry`)

現在のBeta領域:

- AI Office の拡張
- Metrics 収集と分析
- Gas support
- Event 機能
- Bridge / CCTP の運用強化

## 現在の開発方針

優先順:

1. MVP を明文化し、beta 機能と分離する
2. 画面と API の責務を整理する
3. lint / type / build を安定化する
4. 新しい AgentTask を1つ追加して拡張性を検証する

今月は、機能追加より `構造整理と開発基盤の安定化` を優先する。

## 直近4週間の目標

1. MVP / beta 機能境界を固定する
2. `AccountPageClient` の責務分割に着手する
3. lint error を解消し、最低限の静的チェックを安定化する
4. 新しい `AgentTask` を1つ追加できる基盤にする

完了した項目:

- README / roadmap / project state の同期
- `AccountPageClient` の Phase 1 分割
- lint error 解消と build 安定化
- `WEEKLY_REPORT` task の追加と UI 反映
- `ANNOUNCEMENT_DRAFT` task の追加と output renderer registry 化
- `SUPPORTER_MESSAGE_DRAFT` の追加
- `AiOfficePanel` の task type ごとの入力UI整理
- repo 内の `AGENTS.md` / `TASKS.md` / `.github` scaffolding 追加
- `AiOfficePanel` の read-side を aggregated dashboard endpoint に整理
- `mypage` の `me / summary / settlement` 読み出しを aggregated dashboard endpoint に整理
- `AccountPageClient` の write-side を `mypage api client + summary action hook` に整理
- `AccountPageClient` の profile/shell UI state を dedicated hook に整理
- `user save / creator apply / creator profile save` の API 契約を `ok + me` に整理
- `AccountPageClient` の status 別画面を dedicated container に整理
- `creatorReady` 内の `links / project management / summary actions` を section container に整理
- `CreatorProjectManagementSection` の中で `per-currency project block` と `AI Office block` を分離
- `ProjectSection` の create/edit/fetch を dedicated service hook と shared API helper に整理
- `CurrencyGoalSettlementPanel` の summary/goal save/goal achieve を dedicated hook と shared API helper に整理
- `ProjectSettlementPanel` の bridge/distribution write-side を dedicated hook と shared API helper に整理
- `ProjectSettlementPanel` の execution logs / CCTP jobs を section container に整理
- `ProjectSettlementPanel` の bridge form block / distribution draft block を section container に整理
- `ProjectSettlementPanel` の distribution execution block / manual result block を section container に整理
- `ProjectSettlementPanel` の section props を dedicated presenter hook に集約
- `ProjectSettlementPanel` の presenter hook を `bridge / distribution / execution` 単位に分割
- `useProjectSettlementPanel` を `bridge / distribution / execution` の state/action hook と runtime helper に分割
- `NoUser` / `UserOnly` に onboarding progress shell を追加し、登録から申請までの導線を step ベースに整理
- `creatorReady` に daily-work entry overview を追加し、first view を `今日やること / project health / quick shortcuts` に整理
- `creatorReady` workspace navigation を `MVP / beta` 表示に寄せ、home でも日常導線と実験 / 高リスク導線を分離した
- `creatorReady` route と heavy section を lazy-load し、`mypage` 初期 bundle を段階的に削減した
- `AI Office` と `settlement` の internal label / status / message を user-facing copy に整理
- `AI Office` を `Overview / Create / Inbox` 構成に分割し、`AiOfficePanel` を orchestration layer に整理
- `AI Office` の task type select を action card に置き換え、`何をしたいか` ベースで選べる UI に整理
- `AI Office` の create-side task config を shared module に寄せ、task 固有 input UI を dedicated component に分離した
- `AI Office` Inbox を `承認待ちキュー -> 一括操作 -> 最近の履歴` の hierarchy に整理
- `AI Office` の `Overview / Create / Inbox` で success / empty / error 表示パターンを共通化
- `AI Office` の承認待ち導線を `Overview / Create / Inbox` をまたいで可視化
- shared feedback pattern を `settlement` と主要 `mypage` view に広げた
- `settlement` を guided `Bridge -> Draft -> Preflight -> Execute -> Review` flow に整理
- `settlement` の `CCTP` と `manual result` を advanced controls に寄せ、通常 review は実行ログ中心に整理
- `settlement` の mobile 情報密度を下げ、step cards と各 section の主要操作を縦積み中心に整理
- 公開プロフィールの fold 上に support hero を追加し、`何を支援するか -> 進捗 -> すぐ支援` の順に整理
- 公開プロフィールをライトモードに統一し、支援前後の安心感を上げる文言を hero と wallet 導線へ追加
- 公開プロフィールの情報優先順位を再調整し、進捗詳細を wallet より上へ戻して安心文言を簡潔化
- 公開プロフィールの wallet section を `接続 -> ネットワーク -> 通貨 -> 金額 -> 送金` の順に整理し、動画の後に配置
- 公開プロフィールの header / goal / video / wallet / footer の surface tone を揃え、全体をライト基調で統一
- 公開プロフィールの `Creator support` と `Goal/進捗` を同じ surface にまとめ、footer は元の見え方へ戻した

## 進行中の重点課題

- 画面責務が `AccountPageClient` に集中している
- API と UI の仕様が文書化されていない
- 機能は広いが、MVP 機能と beta 機能の境界が薄い
- Git 上で未追跡の実装が多く、レビュー単位が粗い

## 既知の技術的負債

- 未使用変数と `<img>` 警告が多い
- `AgentTask` の output 表示が `AiOfficePanel` に寄っていて今後増えると散らかりやすい
- settlement / bridge / distribution まわりの責務分離がまだ弱い
- `AccountPageClient` 自体の state 責務はまだ重く、write-side action が集まっている
- `creator apply / user save / creator profile save` 以外の旧 route には契約のばらつきが残る
- `ProjectSection` は整理できたが、`CurrencyGoalSettlementPanel` 側の write-side はまだ局所 state が残る
- `ProjectSection` と `CurrencyGoalSettlementPanel` は整理できたが、`ProjectSettlementPanel` 側は依然として state と action が重い
- `ProjectSettlementPanel` はかなり整理できたが、`useProjectSettlementPanel` には fetch/recompute/loading/message orchestration がまだ残っている

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

1. 公開プロフィールの視覚トーン統一後の見え方と wallet 入力導線を手動確認して微調整する
2. guided `settlement` と mobile 密度調整後の見え方を手動確認して微調整する
3. `AI Office` の guided flow をさらに強めるか、現状で十分かを手動確認で判断する
4. `creatorReady` の first view 追加後の section label / CTA hierarchy を手動確認して詰める
5. Supabase `DATABASE_URL` / `DIRECT_URL` の運用ガイドを docs に反映する

直近完了:

- `SUPPORTER_MESSAGE_DRAFT` を追加
- `AiOfficePanel` の task type ごとの入力UIを整理
- AI Office の手動確認 runbook を追加
- task output / metrics 接続仕様を docs に反映
- GitHub Issue / PR / workflow scaffolding を追加
- AI Office の read API を `dashboard service` に集約
- mypage の read API を `dashboard service` に集約
- onboarding progress shell と `NoUser / UserOnly` 導線改善を追加
- `creatorReady` の first view を daily-work entry に寄せた
- `AI Office` と `settlement` の user-facing copy を導入
- `AI Office` を `Overview / Create / Inbox` に分割
- `AI Office` の task type select を action card に置き換えた
- `AI Office` Inbox を `承認待ちキュー / 一括操作 / 最近の履歴` に整理した
- `AI Office` の notice / empty state 表示を `Overview / Create / Inbox` で共通化した
- `AI Office` の承認待ちを `Overview / Create / Inbox` のどこからでも見つけやすくした
- shared notice / empty-state pattern を `settlement` と主要 `mypage` view に広げた
- `settlement` を guided `Bridge / Draft / Preflight / Execute / Review` 順に並べ、current step notice と step overview を追加した
- `settlement` の `CCTP` と `manual result` を Advanced へ落とし、main flow を軽くした
- `settlement` の mobile で step cards と各操作行が詰まりすぎないようにレイアウトを調整した
- 公開プロフィールで支援 CTA を fold 上に移し、wallet section を動画より前に配置した

## 4週間の実行計画

### Week 1

- MVP 機能と beta 機能を固定する
- 画面導線の優先順位を整理する
- README / roadmap / project state を同期する

### Week 2

- `AccountPageClient` の state と責務を分割する
- profile / project / ai office / settlement の境界を明確化する

### Week 3

- lint error を解消する
- warning のうち、構造整理に効くものを減らす
- build / type check を安定化する

### Week 4

- `WEEKLY_REPORT` か同等の新 task type を1つ追加する
- validator / output schema / executor / UI 表示まで通す
- AgentTask 追加フローの型を確立する

結果:

- `WEEKLY_REPORT` を registry ベースで追加済み
- mypage から起票と表示できるコード経路を追加済み
- `lint / tsc / build` を通過

## 検証ポリシー

最低限必須:

- `npm run lint`
- `tsc --noEmit`

重要変更時:

- `npm run build`
- 変更対象画面の手動確認
- 変更対象 API の正常系 / 異常系確認
