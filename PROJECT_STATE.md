# Project State

最終更新: 2026-03-22

## 現在のテーマ

- **Creator OS ビジョンの接続**: consol.txt の6つの思想の核（毎日迷わない / 止まりかけても戻れる / ファンが支援の手応えを持てる / 無名でも信用が積める / 国境を越えて届く）を実装として反映
- **ユーザー属性によるUX分岐**: ファン向けと クリエイター向けで体験を完全に分ける
- **クリエイターワークスペースを2モード化**: `今日の仕事`（AI事務所が主役）と `設定・準備` のみ
- **AI事務所を主画面に**: 承認待ちが毎日の起点になる状態を作る
- 当面の提供価値は `承認付き半自動運営` に限定する（完全自動化はしない）

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
- `Manager Agent` recommendation を `AgentTask` として保存・承認・履歴参照できるようにした
- `distribution plan draft` を approval-only な AI 下書きとして `Draft` step に反映できるようにした
- `AI Office` を role-based surface と usefulness metrics ベースで案内できるようにした
- `Finance Agent` から `settlement Draft` へ advisory payload を handoff できるようにした
- `AI Office` の role filter / deep link / recent shortcut / copied link を追加し、`Overview / Create / Inbox` の guided flow を強めた
- `AI Office` manual check runbook を role-based / Finance handoff / posting metrics 前提に更新した
- `Promotion Agent` の `ANNOUNCEMENT_DRAFT` を `support-page` の posting compose へ advisory handoff できるようにし、`Fan Relation Agent` は copy-only 境界を維持した
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
- `AI Office` の top-level tab を `概要 / 下書きを作る / 承認待ち` の user-facing label に揃え、承認待ちの主導線を `概要` notice と `Inbox` に寄せた
- `/mypage` の直アクセスを `advanced` ではなく `home` 起点に戻した
- `compose / search / notifications / events` の public/community 導線と loading 表示を小さい差分で見直し、誤遷移や dead branch を減らした
- guard / owner auth / env / API response / CORS / Prisma retry / route integration test を横断的に整備し、追加開発前の基盤を固めた
- Phase 2 UX Issues 1〜6 をすべて完了した（2モードナビ・AI事務所主画面・設定正式化・管理ストリップ・投稿ヘッダー統合・初回導線）
- 旧5タブ時代のデッドコード12ファイルを削除し、`SettingsPageClient` のセクション順と精算 [試験中] 表示を整備した

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

Phase 5 完了。次のフェーズは未定。

直近完了:

- Phase 5 Sprint 5-A: `DAILY_ACTION_PLAN` 自動起票（毎朝ホーム画面で今日のタスクが存在しない場合に自動起票）
- Phase 5 Sprint 5-B: `SUPPORTER_RESULT_REPORT` AgentTask 追加（用途別内訳・配分状況・達成後の活動数を報告）
- Phase 5 Sprint 5-C: 公開プロフィールに目標達成インパクトカード追加（GoalAchievementImpactCard / goalAchievementImpact.ts）
- Phase 5 Sprint 5-D: `CAREER_PLAN_DRAFT` AgentTask 追加（3ヶ月・6ヶ月マイルストーンをフェーズ判定付きで生成）
- Phase 5 Sprint 5-E: 新人向け AI 初回ガイドバナー追加（Post.count === 0 && goalMissing の場合に AI 事務所への誘導を表示）
- Phase 4 Sprint 4-A: `DAILY_ACTION_PLAN` AgentTask 追加（今日の優先行動を承認待ち・投稿状況・目標期限から生成）
- Phase 4 Sprint 4-B: `ACTIVITY_RESTART_PROPOSAL` AgentTask 追加（過去成功パターンと段階的再起動ステップを生成）
- Phase 4 Sprint 4-C: `SUPPORT_STORY_DRAFT` AgentTask 追加（why/what/progress 3 セクション構成の支援ストーリーを生成）
- Phase 4 Sprint 4-D: 公開プロフィールに活動実績バッジ追加（活動期間・投稿数・目標達成・累計支援者 / schema 変更なし）
- Phase 4 Sprint 4-E: `TRANSLATE` output に「compose に送る」ボタン追加（PostingComposeHandoff の sourceTaskType を拡張）
- Phase 3 Sprint A-1: `WEEKLY_REPORT` executor が `contentMetricSnapshot` と `contribution` 集計を実クエリしていることを確認・検証済み
- Phase 3 Sprint A-2: 活動サマリーカードに `publishedCount` を追加し「うち公開 N件」を表示
- Phase 3 Sprint C-1: `useProjectSettlementDataFetch` を抽出し `useProjectSettlementPanel` を pure composition layer に分割
- Phase 3 Sprint C-2: lint 警告ゼロを確認（警告なし）
- Phase 3 Sprint D-1: `PROFILE_UPDATE_PROPOSAL` AgentTask を追加（executor / registry / Create UI / output renderer / docs）


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
- `Manager Agent` recommendation を保存可能な `AgentTask` として追加した
- `distribution plan draft` builder / apply flow / `Finance Agent` handoff を追加した
- `AI Office` の role-based surface / usefulness metrics / role deep link を追加した
- `AI Office` manual check runbook を role-based / Finance handoff 前提に更新した
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
- `npm run typecheck`

重要変更時:

- `npm run build`
- 変更対象画面の手動確認
- 変更対象 API の正常系 / 異常系確認
