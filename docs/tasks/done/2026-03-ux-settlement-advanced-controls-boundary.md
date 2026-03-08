# Task

Phase 2 UX: `settlement` の advanced controls 境界を整理する

## Goal

guided `settlement` で、毎回必要な通常フローと、operator 向けの高度な手動操作を明確に分ける。

## Scope

- `CCTP` を bridge step 内の advanced 領域へ移す
- `manual result` を review step 内の advanced 領域へ移す
- `execution logs` は通常の review flow に残す

## Non-Goals

- CCTP / manual result の API 変更
- settlement 全面リデザイン

## Files Likely Affected

- `components/mypage/ProjectSettlementPanel.tsx`
- `components/mypage/ProjectSettlementAdvancedSection.tsx`
- `docs/specs/ux/phase0-phase1-roadmap.md`

## Acceptance Criteria

- 通常フローでは `execution logs` を確認すれば十分だと分かる
- `CCTP` と `manual result` が main flow を圧迫しない
- 必要なときだけ advanced controls を開ける

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `ProjectSettlementAdvancedSection.tsx` を追加し、advanced controls を collapsed view にまとめた
- `CCTP` を bridge step の advanced 領域へ移した
- `manual result` を review step の advanced 領域へ移し、review step には execution logs を主役として残した
