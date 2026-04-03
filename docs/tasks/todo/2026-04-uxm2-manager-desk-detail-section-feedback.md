# UXM-2: Manager Desk Creator Detail の section loading / stale feedback 整理

**Surface**: manager-desk detail
**Status**: 完了（2026-04-04）
**依存**: UXM-1

---

## Goal

`manager-desk/creators/[creatorProfileId]` の detail 面で、
section ごとの再読込時に内容が空に戻りすぎないようにし、
`loading / stale data / fetch failed / empty` を読み分けやすくする。

---

## Scope

- `Supporter CRM / Stage Evidence / Project Members` の loading 表示整理
- section ごとの stale-data notice を共通化
- detail 面で section error が blocking error と混ざらないようにする

---

## Non-Goals

- creator detail read model の変更
- save flow の大規模な再設計
- permission model の変更

---

## Acceptance Criteria

- [x] section 再読込中に既存データを残したまま pending が見える
- [x] section fetch error が empty と混ざらない
- [x] stale data 表示中でも retry 導線がある

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Result

- `Supporter CRM / Stage Evidence / Project Members` の hook で refetch 失敗時も stale data を保持するようにした
- section ごとに `初回 loading / 再読込中 / stale error / empty` を読み分ける notice を追加した
- `ManagerDeskCreatorDetailPreviewClient.tsx` から section reload を渡し、stale error 時の retry 導線を有効にした
