# Task

AI operational assistance on structured context

## Status

- ready
- next recommended implementation slice after Meeting / Planner migration

## Goal

`ManagerAssignment / ManagerNote / ExternalContact / ActionLog / Meeting / PlannerTimeline`
の structured context を使って、
Creator Home と Manager Desk で **すぐ使える AI 補助** を成立させる。

## Scope

- `AI Daily Briefing` を planner / project / note / contact signal ベースに再構成する
- `Manager Note summarization` を実務で読める短い summary に揃える
- `follow-up extraction` を note / contact / meeting source ごとに補助する
- AI提案を `候補 / 理由 / 採用可否` の形で UI に返す

## Non-Goals

- full autonomy
- 無断送信
- AI による最終意思決定
- stage / trust scoring の本実装

## Issue Sequence

### Issue AO-1

Daily Briefing read contract

やること:

- planner summary、active project、risk note、contact next action を入力にした briefing contract を決める
- Creator Home hero / AI Manager へ戻す summary shape を決める

### Issue AO-2

Manager Note summarization and follow-up extraction

やること:

- `ManagerNote.aiSummary` の生成 / 再生成ルールを決める
- `followUpNeeded / followUpDueAt` が弱い note を補助的に抽出する
- `ExternalContact.nextAction` と meeting decisions を補助入力に含める

### Issue AO-3

UI connection

やること:

- Creator Home に `AI Daily Briefing` を接続する
- Manager Desk に短い AI summary / attention cards を接続する
- 採用 / 保留 / 却下 の UI 方針を最小で決める

## Files Likely Affected

- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyDailyBriefingHero.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyAiManagerSection.tsx`
- `/Users/shounokazuaki/cf/components/managerDesk/ManagerDeskDashboardClient.tsx`
- `/Users/shounokazuaki/cf/components/managerDesk/ManagerDeskCreatorDetailPreviewClient.tsx`
- `/Users/shounokazuaki/cf/lib/creator-ai/`
- `/Users/shounokazuaki/cf/lib/operations/`
- `/Users/shounokazuaki/cf/docs/specs/creator-ai-office/task-output-contracts.md`

## Acceptance Criteria

- Creator Home に structured context ベースの briefing が出る
- Manager Desk に実務で使える短い AI summary が出る
- note / contact / meeting 由来の follow-up を AI が補助抽出できる
- AI提案は理由付きで提示され、人が採否を持てる

## Risks

- planner / note / contact の signal を一気に混ぜすぎると briefing がうるさくなる
- AI提案を押しつける UI にすると Creator / Manager の主体性を削る
- structured input を増やしすぎると first pass の速度が落ちる

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`

