# Task

Creator Home deferred sections

## Status

- ready
- follows AI operational assistance and manager-side follow-up slices

## Goal

`Creator Home first slice` の後段要素である
**Manager Feed / Growth / Reflection** を、いま追加した planner と自然につながる形で実装する。

## Scope

- `Manager Feed` の共有可能 note surface
- `Growth / Reflection` の minimum summary
- planner / project progress / AI cards との導線整理

## Non-Goals

- full analytics dashboard
- trust / stage scoring の本実装
- creator-facing CRM

## Issue Sequence

### Issue CHD-1

Manager Feed MVP

やること:

- `ManagerNote.visibility = SHAREABLE_WITH_CREATOR` を home に返す read model を作る
- creator が「Manager が何を進めているか」を短く見られるようにする

### Issue CHD-2

Growth / Reflection MVP

やること:

- `ActionLog` と投稿 / progress を使って月次の最小 summary を作る
- 継続 / 完了 / 次の改善点を 1 セクションにまとめる

## Files Likely Affected

- `/Users/shounokazuaki/cf/components/mypage/CreatorReadyHomeRoute.tsx`
- `/Users/shounokazuaki/cf/components/mypage/`
- `/Users/shounokazuaki/cf/app/api/mypage/`
- `/Users/shounokazuaki/cf/lib/operations/`

## Acceptance Criteria

- Creator Home で manager 由来の共有情報が見える
- growth summary が planner や progress と切れずに読める
- settings より運営が前にある構成を維持できる

## Risks

- manager-only 情報を feed に混ぜると責任境界が崩れる
- reflection を数字だけにすると constitution の「意味と次の一手」が弱くなる

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
