# UXM-3: Manager Desk Creator Detail の mutation feedback 整理

**Surface**: manager-desk detail
**Status**: 完了（2026-04-04）
**依存**: UXM-2

---

## Goal

`manager-desk/creators/[creatorProfileId]` の detail 面に残っている
raw text ベースの保存成功・失敗表示を notice ベースに揃え、
保存中 / 完了 / エラー / 入力不足 を読み分けやすくする。

---

## Scope

- `Stage Evidence` の記録フォーム feedback 整理
- `Project Members` の追加フォーム feedback 整理

---

## Non-Goals

- mutation API の仕様変更
- add / save 挙動の変更
- Creator Detail 全面の保存系刷新

---

## Acceptance Criteria

- [x] 保存失敗が raw text ではなく notice として見える
- [x] 保存成功が次の行動と一緒に分かる
- [x] フォームの保存中と通常状態が区別できる

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Result

- `ManagerDeskQueryFeedback.tsx` に mutation 用 notice を追加した
- `Stage Evidence` の保存成功・失敗表示を raw text から notice に置き換えた
- `Project Members` の追加成功・失敗表示を raw text から notice に置き換えた
