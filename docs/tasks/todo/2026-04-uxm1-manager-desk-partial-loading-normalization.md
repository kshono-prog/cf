# UXM-1: Manager Desk の部分 loading / filter feedback 整理

**Surface**: manager-desk
**Status**: 完了（2026-04-04）
**依存**: UXA-2

---

## Goal

Manager Desk の filter 変更や refetch で画面全体が壊れて見えないようにし、
部分 loading と empty / error / auth-required の境界を明確にする。

---

## Scope

- dashboard / contacts / notes / activity / opportunities の loading 表示棚卸し
- filter 変更時の pending feedback 統一
- empty / no-results / auth-required / fetch-failed の文言を整理

---

## Non-Goals

- read model の大規模変更
- Manager Desk の情報設計刷新
- permission model の変更

---

## Files Likely Affected

```
components/managerDesk/*.tsx
components/managerDesk/use*.ts
```

---

## Acceptance Criteria

- [x] filter 変更時に全面 loading へ戻りすぎない
- [x] no-results と fetch error が混ざらない
- [x] auth-required UI と data-empty UI が区別できる

---

## Risks

- hook ごとに loading state の持ち方が異なる
- optimistic UI を急ぐと整合性が崩れる

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- filter 変更
- auth-required 状態
- empty 状態
- fetch error 状態

---

## Result

- manager-desk の主要 read hook で refetch 失敗時も stale data を保持するようにした
- `Contact Pipeline / Notes Surface / Activity Timeline / Opportunity CRM` で初回 loading と filter 変更中の pending を分離した
- stale data 表示中の non-blocking error notice を共通化した
- `Activity Timeline / Opportunity CRM` の empty copy を filter-aware に調整した
- `Missing Items` も section 単位で partial loading / stale error を表示するようにした
