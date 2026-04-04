# UXF-2: non-clickable surface を四角に統一する

## 背景

`UXF-1` で non-clickable surface を near-square に寄せたが、まだ small radius が残っている。

今回の要望はより明確で、クリックできないものは四角、クリックできるものは丸みを残す方向で統一したい。

## 目的

- non-clickable な card / notice / badge / chip / static container を四角にする
- button / link / input など操作対象の丸みは維持する
- shared CSS で広く効かせる

## 非目的

- CTA や導線の変更
- interaction behavior の変更
- high-risk surface の操作仕様変更

## 対応方針

1. static radius token を `0px` にする
2. shared static class はすべて square に寄せる
3. `rounded-*` utility を持つ static semantic element も square に補正する

## 完了条件

- non-clickable surface が四角になる
- clickable element の丸みは維持される
- `lint / typecheck / build` が通る

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## 完了メモ

- static radius token を `0px` に変更
- shared static class と `WorkspaceFeedback` が square になるよう調整
- `rounded-sm / md / lg / xl / 2xl / 3xl / full / rounded-[...]` を持つ static semantic element も square に補正
- button / link / input の丸みは維持
