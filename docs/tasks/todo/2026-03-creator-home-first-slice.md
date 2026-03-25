# Task

Creator Home first slice の issue 分解

Status:

- `CH-1` 完了
- `CH-2` 完了
- deferred: `Manager Feed` / `Upcoming / Planner` / `Growth / Reflection`

## Goal

[`Creator Home 再設計案`](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md) を、
現行の `daily-work` ルートと既存データだけで実装可能な単位へ落とし、
`1 Issue = 1 PR` で安全に進められる最初の slice を固定する。

## Scope

- `daily-work` ルートで現在使っているデータと UI セクションの責務を整理する
- `Hero / Daily Briefing`、`Project Progress`、`AI Manager`、`Today / This Week`、`Settings / Edit` の実装順を分解する
- 既存データのみで出せる部分と、manager core models 待ちの部分を切り分ける
- 各 issue の完了条件と validation を明文化する

## Non-Goals

- `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の schema 実装
- `Manager Feed`、`Upcoming / Planner`、`Growth / Reflection` の本実装
- 新しい `Meeting` / `ActivityTask` 永続モデルの追加
- 公開プロフィールの再設計

## Files Likely Affected

- `/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyHomeRoute.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyWorkspaceRouteContent.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyProjectHealthSection.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyWeeklySummarySection.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorWorkspaceAiOfficePanel.tsx`
- `/Users/shounokazuaki/cf/components/mypage/useCreatorReadyHomeStats.ts`
- `/Users/shounokazuaki/cf/components/mypage/useDailyActionPlanAutoTrigger.ts`
- `/Users/shounokazuaki/cf/lib/mypage/dashboardTypes.ts`
- `/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md`

## Existing Data Reuse

- `useCreatorReadyWorkspaceProjectDashboards("daily-work")`
  Hero / Project Progress の主要材料に使う
- `useCreatorReadyHomeStats`
  Hero の補足値、`Today / This Week` のヒント、Growth の種データに使う
- `hasCreatorReadySettlementAttention`
  Hero の注意カードと action 導線に使う
- `useDailyActionPlanAutoTrigger`
  `AI Manager` と `Today / This Week` の既存 AI 補助導線として使う
- `CreatorWorkspaceAiOfficePanel`
  first slice では置き換えず、`AI Manager` の中核として再配置・ラップする
- `SettingsPageClient`
  編集機能の受け皿として残し、Home からは折りたたみ / 明示 CTA で接続する

## Issue Sequence

### Issue CH-1

`Home shell / Hero / Project Progress` の優先順位を組み替える

- `CreatorReadyHomeRoute` の上部を、通知バナー中心から `Daily Briefing Hero` 中心へ再構成する
- 現在の `活動サマリー` と `支援の進み具合` を、`状態 -> 次の一手` が読めるカードへ寄せる
- setup / settlement attention は残しつつ、Hero の文脈カードとして統合する
- `Settings / Edit` は `settings` ルートを維持し、Home では「編集を開く」導線へ後退させる

完了条件:

- Home を開いて最初の 1 画面で「今の状態」と「次に見るべきもの」が分かる
- `Project / Goal / Summary` が編集 UI ではなく進捗カードとして読める
- 設定編集は残るが、Home の主役ではなくなる

### Issue CH-2

`AI Manager` cards と `Today / This Week` を既存データから導出する

- `CreatorWorkspaceAiOfficePanel` 周辺を整理し、Home 上では「運営カード」として見せる
- 既存シグナルから `Today / This Week` を派生表示する
  - Goal 未設定
  - settlement attention
  - AI task 承認待ち
  - 投稿停滞
  - Home stats / progress
- 新しい永続タスクモデルは入れず、first slice は derived tasks で成立させる

完了条件:

- Home に「今日やること / 今週やること」が出る
- AI 提案がチャット入口ではなく、行動候補として読める
- 新規 DB モデルなしで ship できる

### Deferred After Manager Core Models

- `Manager Feed`
  `ManagerNote.visibility = SHAREABLE_WITH_CREATOR` が入ってから実装する
- `Upcoming / Planner`
  `Meeting / ActivityTask / ExternalContact.nextActionDueAt` の最小 contract が揃ってから実装する
- `Growth / Reflection`
  `ActionLog` の蓄積後に実装する

## Current Result

- `CH-1`: `Daily Briefing Hero` と `Project Progress` の先頭配置を実装済み
- `CH-2`: `AI Manager` cards と `Today / This Week` の derived tasks を実装済み
- next step は manager core schema approval と `Manager Desk` 側の read model 設計

## Acceptance Criteria

- Creator Home first slice が `CH-1` と `CH-2` に分解されている
- 各 issue で触るファイルと deferred 項目が明示されている
- `manager core models` 依存の項目が Home first slice から切り離されている
- 実装着手時に、そのまま issue / PR 説明として使える

## Risks

- `CreatorReadyHomeRoute` に責務を載せすぎると、再び中央集権コンポーネント化する
- `AI Manager` を既存 `AI Office` と二重実装すると UX も実装もぶれる
- `Settings / Edit` の後退が強すぎると、未設定ユーザーの初回導線が弱くなる

## Validation

- 文書レビューで `CH-1` / `CH-2` / deferred の切り分けが妥当か確認する
- 実装時は `npm run lint`
- 実装時は `npm run typecheck`
- 実装時は `npm run build`
- 実装時は `/[username]/mypage` を `noUser / userOnly / creatorReady / setup-needed` で手動確認する
