# Creator AI Office Overview

## 目的

クリエイターの運営実務を、`提案 -> 必要なら確認 -> 利用` の流れで支援する。

## ユーザー価値

- 今やるべきことが分かる
- 投稿、告知、翻訳、報告の下書きがある
- 支援状況と活動状況を同時に見られる
- 低リスクな定常業務を AI に任せられる

## コアフロー

1. 活動データと支援データを集める
   v1 では外部SNS API ではなく、Creator Founding 内の投稿と反応を優先して使う
2. AI が分析、提案、または `Manager Agent` recommendation task を作る
3. クリエイターが task をそのまま確認するか、確認ステップ付きで扱うかを選ぶ
4. 確認が必要な task だけ review 後に使い、情報系 task はそのまま参照する
5. 結果を履歴として保存する

## v1 の対象

- `ANALYZE`
- `MANAGER_NEXT_ACTIONS`
- `DISTRIBUTION_PLAN_DRAFT`
- `PROPOSE`
- `TRANSLATE`
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`

role-based surface:

- `Manager`
  - next action、達成判断、週次の運営整理
- `Promotion`
  - 投稿、告知、翻訳、公開向けの下書き
- `Finance`
  - 進捗整理、配分準備、settlement draft の補助
- `Fan Relation`
  - お礼、再案内、支援者向けメッセージ

top-level tabs:

- `概要`
  - usefulness metrics、最近使った担当、承認待ち notice、最近作った内容を見る入口
- `下書きを作る`
  - 担当を選んで task を起票し、必要なら同じ担当の承認待ちへ戻る入口
- `承認待ち`
  - 承認待ちキュー、一括操作、最近の履歴を role ごとに確認する入口

usefulness metrics:

- `対応率`
  - 直近 30 日の review 前提 task のうち、確認または却下まで判断された割合
- `計測対象`
  - `compose handoff / settlement draft apply / copy` まで追える状態になった task 数
- `承認`
  - owner が確認して `DONE` に進んだ task 数
- `却下`
  - owner が却下して差し戻した task 数
- `保留が長い`
  - 72 時間以上 `WAITING_APPROVAL` のまま残っている task 数
- `使われた結果`
  - handoff または copy が実際に行われた task 数
- `活用率`
  - `計測対象` のうち、実際に handoff または copy に進んだ割合
- `中央判断時間`
  - 確認または却下までにかかった時間の中央値

Phase 1 では、この指標を `AI Office Overview` に出して「どの agent output が実際の次アクションにつながったか」を読む。
既存の `対応率 / 承認 / 却下 / 保留が長い` は review flow の健全性を見続けるために残し、`使われた結果 / 活用率` を downstream 利用の補助指標として追加する。
ユーザー向けの tab ラベルは `概要 / 下書きを作る / 承認待ち` とし、承認待ち件数の主な確認場所は `概要` の notice と `承認待ち` タブに寄せる。
role を選んで作った task は、`Manager / Promotion / Finance / Fan Relation` ごとの対応率としても確認する。
また `Create` 画面では、この role usefulness を使って「先に確認したい role」または「いま活用が進んでいる role」を案内する。
role を選んだあとの task card も、最近の `活用率 / 利用件数 / 承認待ち件数` を手がかりに並び替えて表示する。
Overview の role breakdown からは、保留がある role なら `Inbox`、保留がない role ならそのまま `Create` に進める。
`Inbox` では role chip で承認待ちと履歴を role 単位に絞り込み、優先 role の notice からそのまま切り替えられる。
role で絞った `Inbox` に承認待ちがなければ、そのまま同じ role の `Create` に戻って次の下書きへ進める。
`Create` でも選択中 role の承認待ちを検知し、その role に絞った `Inbox` へ戻る導線を出す。
この tab / role 文脈は search params に同期し、リロードや再訪でも同じ role から再開しやすくする。
`Overview` の role CTA では、この文脈を含んだ deep link もコピーでき、runbook や運用メモに再利用できるようにする。
また `Overview / Inbox` には最近使った role 導線を再表示し、直前に触っていた role の `Create / Inbox` へ戻りやすくする。
recent shortcut には `最終利用時刻` と現在の `承認待ち / 保留が長い` 件数も添え、次にどの role を見るか判断しやすくする。
この shortcut の並び順は、`保留が長い > 承認待ち > 直近に使った` の優先度を基本とする。
各 shortcut からは、同じ role の `Inbox` と `Create` の両方へ移動できるようにする。
また recent shortcut からは、同じ role の `Inbox link` と `Create link` を個別にコピーできるようにする。
コピーした role link は `Overview / Inbox` に最近の履歴として残し、あとから同じ `Inbox / Create` 文脈を開き直したり再コピーしたりできるようにする。
`Finance Agent` では `DISTRIBUTION_PLAN_DRAFT` を AI Office から作成し、その advisory payload を `advanced` の `Draft` step に handoff できるようにする。
`Promotion Agent` の `ANNOUNCEMENT_DRAFT` では local handoff で `support-page` の posting compose に下書きを渡せるようにし、`Fan Relation Agent` の `SUPPORTER_MESSAGE_DRAFT` は public posting へは直接 handoff せず copy 境界を保つ。

Phase 1 の follow-through 定義:

- `Promotion`
  - `PROPOSE / TRANSLATE / ANNOUNCEMENT_DRAFT / SUPPORT_STORY_DRAFT` で `posting compose` を開いた時点を `使われた` とみなす
- `Finance`
  - `DISTRIBUTION_PLAN_DRAFT` の提案が `advanced` の `Draft step` に行として反映された時点を `使われた` とみなす
- `Fan Relation`
  - `SUPPORTER_MESSAGE_DRAFT` の本文を copy した時点を `使われた` とみなす
- `Manager`
  - 現段階では直接の downstream action を固定していないため、`使われた結果` ではなく review 系指標を主に見る

将来の段階計画:

- x402 は low-risk な analysis / draft API のみ候補にする
- 詳細は `docs/specs/creator-ai-office/ai-office-x402-rollout.md`
- Phase 1 実行計画は `docs/specs/creator-ai-office/phase1-delivery-plan.md`

## v1 の対象外

- 完全自動投稿
- 金銭移動の自動決定
- 外部サービスへの全面自動連携
