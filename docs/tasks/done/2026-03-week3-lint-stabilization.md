# Task

lint / type / build の安定化

## Goal

AI が継続的に開発しやすいように、静的チェックの失敗要因を減らす。

## Scope

- 現在の lint error を解消する
- warning のうち構造改善に効くものを優先して減らす
- build に支障がある箇所を洗い出す

## Non-Goals

- すべての warning をゼロにする
- 表示品質の全面改善

## Files Likely Affected

- `scripts/importSocialsAndVideos.cjs`
- `app/[username]/mypage/AccountPageClient.tsx`
- `components/profile/*`
- `components/mypage/*`

## Acceptance Criteria

- lint error が解消される
- type check が安定して通る
- 優先 warning が減る

## Risks

- warning を消すために不要な変更を入れすぎる
- 本質的な構造問題を先送りする

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Result

- lint error を 0 にした
- lint warning を 47 から 17 に削減した
- `npx tsc --noEmit` を通した
- `npm run build` を通した
- 残る warning は主に `<img>` 最適化と未使用補助コードに集約された
