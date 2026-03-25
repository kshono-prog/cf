# Task

Manager Desk first slice の issue 分解

Status:

- `MD-1` 完了
- `MD-2` 完了
- `MD-3` 完了
- next: `Meeting / Planner minimum contract`
- depends on: manager core schema 実装完了
- sequence: `MD-1` -> `MD-2` -> `MD-3`

## Goal

[`Manager Desk 要件定義`](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md) と
[`Manager Desk データモデル定義`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md) を、
現行の phase 1 schema / API の上で実装可能な単位へ落とし、
`Dashboard / Creator Detail` の最初の slice を `1 Issue = 1 PR` で安全に進められるようにする。

## Scope

- `Manager Desk` の first slice を `read model -> dashboard -> creator detail` に分解する
- 現在の DB と API だけで出せる項目と、`Meeting / ActivityTask / AgentSuggestion persistence` 待ちの項目を切り分ける
- どの route / helper / component を先に作るべきか明文化する
- 各 issue の acceptance criteria と validation を固定する

## Non-Goals

- `Meeting` 永続モデルの追加
- `ActivityTask` 永続モデルの追加
- `Supporter CRM / Opportunity CRM` の追加
- `Contact Pipeline / Notes / Activity Timeline` の full UI 実装
- Trust / Stage / Skill system の本実装

## Files Likely Affected

- `/Users/shounokazuaki/cf/app/api/manager-assignments/route.ts`
- `/Users/shounokazuaki/cf/app/api/manager-notes/route.ts`
- `/Users/shounokazuaki/cf/app/api/external-contacts/route.ts`
- `/Users/shounokazuaki/cf/app/api/action-logs/route.ts`
- `/Users/shounokazuaki/cf/lib/managerDesk/server.ts`
- `/Users/shounokazuaki/cf/lib/managerDesk/`
- `/Users/shounokazuaki/cf/components/`
- `/Users/shounokazuaki/cf/app/[username]/`
- `/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md`
- `/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md`

## Existing Data Reuse

- `ManagerAssignment`
  dashboard の担当 creator 一覧と access control に使う
- `ManagerNote`
  最新メモ、follow-up、risk、shared / private boundary に使う
- `ExternalContact`
  要返信、next action、temperature、contact freshness に使う
- `ActionLog`
  直近アクション、timeline、staleness 判定、次の step 提示の材料に使う
- `Project / Goal / Summary`
  creator ごとの進捗・停止判定・優先度の材料に使う
- `AI Office dashboard`
  manager-side summary card の初期値として再利用できる可能性がある

## Issue Sequence

### Issue MD-1

`Manager Desk read model` を定義する

- manager wallet address を入力にして、担当 creator 一覧を返す read model helper を作る
- `Dashboard` で最初に必要なフィールドだけを返す
  - creator basic
  - active project / goal progress
  - latest note
  - next contact action
  - latest action timestamp
  - risk / follow-up flags
- `Creator Detail` で最初に必要な集約 shape を定義する
  - latest project summary
  - latest manager notes
  - key contacts
  - recent action logs
- `Meeting` / `Task` 未実装部分は derived / placeholder に留める

完了条件:

- `Dashboard / Creator Detail` に必要な read model が TypeScript 上で定義されている
- 現在の schema だけで返せる項目と deferred 項目が分かれている
- manager wallet address 単位でデータを安全に取得できる

現在地:

- 完了: [readModel.ts](/Users/shounokazuaki/cf/lib/managerDesk/readModel.ts) を追加
- 完了: [dashboard route](/Users/shounokazuaki/cf/app/api/manager-desk/dashboard/route.ts) を追加
- 完了: [creator detail route](/Users/shounokazuaki/cf/app/api/manager-desk/creators/[creatorProfileId]/route.ts) を追加

### Issue MD-2

`Manager Desk Dashboard MVP` を実装する

- manager 向け top route を追加する
- 担当 creator を priority 順に並べる
- `今日見るべき Creator`、`止まっている Creator`、`要返信 / 要フォロー` を first screen で出す
- card + table hybrid の一覧を最小構成で作る
- `Creator Detail` への導線をつなぐ

完了条件:

- manager が 10 秒以内に「今日どこを見るべきか」を把握できる
- 担当 creator ごとの current state が一覧で比較できる
- manager core models から来る signals が UI に反映される

現在地:

- 完了: [ManagerDeskDashboardClient.tsx](/Users/shounokazuaki/cf/components/managerDesk/ManagerDeskDashboardClient.tsx) を追加
- 完了: [manager-desk page](/Users/shounokazuaki/cf/app/manager-desk/page.tsx) を追加
- 完了: [manager-desk layout](/Users/shounokazuaki/cf/app/manager-desk/layout.tsx) を追加
- 完了: [CreatorReadyWorkspaceHeader.tsx](/Users/shounokazuaki/cf/components/mypage/CreatorReadyWorkspaceHeader.tsx) に `Manager Desk` 導線を追加

### Issue MD-3

`Creator Detail MVP` を実装する

- 1 creator の状況を 1 画面で見られる detail view を追加する
- 最初は次だけを優先する
  - active project / goal progress
  - latest notes
  - key contacts
  - recent action logs
  - next actions
- `Meeting / Planner` がまだない部分は、`coming next` として責務を分ける

完了条件:

- manager が 1 creator の現在地を detail で追える
- note / contact / action history が分断されず読める
- 次に `Meeting / Planner` を載せる受け皿ができている

現在地:

- 完了: [ManagerDeskCreatorDetailPreviewClient.tsx](/Users/shounokazuaki/cf/components/managerDesk/ManagerDeskCreatorDetailPreviewClient.tsx) を detail MVP 構成へ更新
- 完了: [creator detail page](/Users/shounokazuaki/cf/app/manager-desk/creators/[creatorProfileId]/page.tsx) から 1 creator view に遷移可能
- 完了: `next actions / project progress / notes / contacts / action log / coming next` を 1 画面に統合

## Deferred After First Slice

- `Contact Pipeline`
  contact volume が増えた後に追加する
- `Notes / Activity Timeline` 専用画面
  dashboard / detail の基本導線が固まってから分離する
- `AI prioritization`
  first slice では deterministic signal を優先し、AI 優先順位付けは後段に載せる
- `Meeting / Planner`
  専用 contract が決まってから統合する

## Recommended Next Order

1. `Meeting / Planner minimum contract`
2. AI note summarization / follow-up extraction
3. `Contact Pipeline / Notes / Activity Timeline` の後続 slice

## Acceptance Criteria

- Manager Desk first slice が `MD-1` / `MD-2` / `MD-3` に分解されている
- `MD-1` の read model と API 入口が repo に存在する
- 各 issue がそのまま task / PR 説明として使える
- 現行 schema で実装できる範囲と deferred 項目が分かれている
- 次に手を付ける順番が docs 上で共有されている

## Risks

- read model を先に固めず UI を作ると、dashboard と detail で同じ集約を二重実装しやすい
- `Meeting / Task` が未実装のまま detail を重く作りすぎると、すぐ作り直しになる
- AI 優先順位づけを早く入れすぎると、deterministic な運営 signal が見えにくくなる

## Validation

- 文書レビューで `MD-1` / `MD-2` / `MD-3` / deferred の切り分けが妥当か確認する
- 実装時は `npm run prisma:validate`
- 実装時は `npm run lint`
- 実装時は `npm run typecheck`
- 実装時は `npm run build`
- 実装時は manager owner / creator owner / unauthorized actor の access を手動確認する
