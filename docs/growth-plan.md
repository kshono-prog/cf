# Growth Plan

## Goal

Creator Founding の次フェーズの目標は、未登録ユーザーが最短で公開ページを完成させ、SNS で拡散し、初回支援まで到達できる導線を作ることです。

金融フローを作り直すのではなく、既存の `Project / Goal / Summary / Contribution` を維持したまま、その手前に onboarding / AI draft / growth tracking を積み上げます。

## Why now

- 現状は機能自体は増えているが、新規ユーザーにとって「次に何をすべきか」が見えにくい
- 公開ページ完成前に離脱すると、既存の支援フローの価値が届かない
- AI は自動実行よりも、最初の文章と公開準備の下書き支援で最も効果が出やすい
- まず公開率と初回支援率を上げることで、その後の Manager / AI Office / CRM 施策も活きやすくなる

## North Star Metrics

- `wallet_connected -> user_registered`
- `user_registered -> creator_applied`
- `creator_applied -> project_created`
- `project_created -> goal_saved`
- `goal_saved -> public_page_viewed_by_owner`
- `public_page_viewed_by_owner -> share_drafts_generated`
- `share_drafts_generated -> share_post_logged`
- `share_drafts_generated -> first_tip_received`

## Funnel

1. ウォレット接続
2. ユーザー登録
3. クリエイター申請
4. 基本プロフィール入力
5. 最初の Project 作成
6. Goal 設定
7. 公開ページを owner 自身が確認
8. AI 拡散文面生成
9. SNS 共有
10. 投稿記録
11. 初回支援受領

## Phase plan

- Phase 1: `GrowthEvent` と `/api/growth/events` を追加し、主要アクションを計測可能にする
- Phase 2: mypage を管理画面中心ではなく公開セットアップ中心に寄せ、進捗率と next action を見せる
- Phase 3: AIプロフィール下書きを追加し、自然文からプロフィール / Goal / Project の叩き台を作る
- Phase 4: AI拡散文面生成を追加し、公開ページ URL を含む各SNS向け文面を作る
- Phase 5: 公開ページで owner だけに軽い成長 CTA を出し、公開確認と拡散導線をつなぐ
- Phase 6: docs と運用認識を growth-first に更新する
- Phase 7: `first_tip_received` をサーバー確定で記録し、mypage に growth overview を追加する
- Phase 8: home / settings に growth coach を追加し、次の打ち手を即座に案内する
- Phase 9: share draft の後に manual share execution log を置き、投稿実行の有無を可視化する

## Events

- `wallet_connected`
- `user_registered`
- `creator_applied`
- `profile_ai_generated`
- `profile_saved`
- `project_created`
- `goal_saved`
- `public_page_viewed_by_owner`
- `share_drafts_generated`
- `share_copied`
- `share_post_logged`
- `first_tip_received`

イベントの原則:

- growth event の失敗で UI を止めない
- owner auth なしの軽量計測 API として扱う
- metadata は unknown を受け、保存前に serialize / validate する
- financial action と growth action の責務を混ぜない
- `first_tip_received` は client click ではなく confirmed contribution path で確定記録する

## Current shipped slice

- growth setup progress と next action は mypage settings に実装済み
- AIプロフィール下書きと AI拡散文面生成は propose-first で実装済み
- `public_page_viewed_by_owner` は公開ページ owner view から記録済み
- `first_tip_received` は支援確定 API から best-effort に記録する
- owner 向け `GET /api/mypage/growth-overview` で milestone / recent events / first tip 状態を確認できる
- `GrowthCoachCard` が home / settings で次の成長アクションを提示する
- setup progress / next action は local milestone に加えて growth overview の server facts でも補強する
- settings で `share_post_logged` を手動記録でき、growth overview / growth coach が投稿実行まで追跡する

## AI agents roadmap

- Creator Setup Agent
  - プロフィール、Goal、Project 初期案の下書きを提案する
- Promotion Draft Agent
  - X / Instagram / 英語版などの拡散文面を提案する
- Growth Ops Agent
  - ファネル詰まりを見つけ、次に改善すべき導線を示す
- External Promotion Agent
  - 将来的な外部投稿・配信連携を担うが、初期段階では自動実行しない

## Non-goals

- いきなり自動投稿しない
- いきなり大型SNS機能を作らない
- いきなり新しい金融フローを増やさない

## Open questions

- setup completion の達成条件をどこまで厳密にするか
- share draft の再生成履歴を保存するか
- growth event を将来ダッシュボード化するときの read model を別テーブルにするか
- owner が公開ページを確認しただけで十分か、追加でチェックリストを設けるか
- growth coach の判断材料に投稿頻度や recent engagement をどこまで混ぜるか
- `share_post_logged` の metadata を将来どこまで read model 化するか
