# Task

Phase 1C: AI Office を role-based surface に整理する

## Goal

AI Office を `Manager / Promotion / Finance / Fan Relation` の役割で理解できる UI に寄せる。

## Scope

- role registry を UI に反映する
- task type を role ごとに整理して表示する
- action cards / inbox copy / overview copy を更新する
- docs と tests を更新する

## Non-Goals

- すべての task type の作り直し
- role ごとの完全な権限制御実装

## Files Likely Affected

- `lib/creator-ai/agentRoleRegistry.ts`
- `components/mypage/aiOfficeTaskConfig.ts`
- `components/mypage/AiOfficePanel.tsx`
- `docs/specs/creator-ai-office/overview.md`

## Acceptance Criteria

- creator が role ベースで AI Office の入口を理解できる
- 既存 task type は後方互換で利用できる
- role と task type の対応が docs と code で一致している

## Risks

- role 表現が抽象的すぎると、逆に何ができるか分かりにくい
- UI の整理だけで task quality が改善したように見えてしまう

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- AI Office Overview / Create / Inbox の手動確認
