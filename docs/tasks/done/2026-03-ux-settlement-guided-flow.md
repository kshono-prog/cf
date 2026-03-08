# Task

Phase 2 UX: `settlement` を guided `Bridge -> Draft -> Preflight -> Execute -> Review` flow に寄せる

## Goal

`settlement` の section を operator-oriented な塊ではなく、実際の進行順に沿った guided flow として理解できるようにする。

## Scope

- step overview を追加する
- current step を上部 notice で明示する
- `送信前チェック` を `配分実行` から切り分けて独立 step にする
- `CCTP` を `Bridge` step 側に寄せ、`Review` は結果確認に集中させる

## Non-Goals

- settlement API の仕様変更
- 完全な wizard 化

## Files Likely Affected

- `components/mypage/ProjectSettlementPanel.tsx`
- `components/mypage/ProjectSettlementGuidedFlow.tsx`
- `components/mypage/ProjectSettlementPreflightSection.tsx`
- `components/mypage/ProjectSettlementDistributionExecutionSection.tsx`
- `components/mypage/useProjectSettlementExecutionSectionProps.ts`

## Acceptance Criteria

- first view で `Bridge -> Draft -> Preflight -> Execute -> Review` の順が分かる
- current step が notice と step card の両方で分かる
- `送信前チェック` と `配分実行` が別 step として見える

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `ProjectSettlementGuidedFlow.tsx` を追加し、step overview と step section header を定義した
- `ProjectSettlementPanel.tsx` に current step notice と scroll-driven guided layout を追加した
- `ProjectSettlementPreflightSection.tsx` を新設し、`送信前チェック` を独立 step に分離した
- `Review` step には execution logs と manual result を集約し、`CCTP` は bridge 側へ寄せた
