# UXF-1: clickable / static の radius semantic を分ける

## 背景

現在の UI は `rounded-2xl` や `rounded-full` が広く混在しており、クリックできる要素とクリックできない要素の見た目の区別が弱い。

特に non-clickable な card / notice / badge / loading surface まで大きく丸い角になっているため、操作できそうに見える面が残っている。

## 目的

- クリック可能な要素は丸みを維持してよい
- クリックできない要素は四角に近い小さな R に寄せる
- shared style のレベルで寄せ、個別コンポーネント修正を最小限にする

## 非目的

- レイアウトや導線の変更
- ボタンやリンクの挙動変更
- high-risk surface の行動フロー変更

## 対応方針

1. `app/globals.css` に static surface 用 radius token を追加する
2. `surface-card / panel-card / data-tile / status-badge` など shared static class の radius を小さくする
3. `div / section / article / aside / details` に対する `rounded-xl / rounded-2xl / rounded-3xl` を static surface 向けに軽く補正する
4. `WorkspaceFeedback` 系は shared class に合わせて near-square に寄せる

## 完了条件

- ボタン・リンクは従来の丸みを保つ
- non-clickable な notice / loading / card / badge が小さな R に揃う
- 大規模なファイル個別修正なしで、shared style 中心に反映される

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## 完了メモ

- static surface 向け radius token を追加
- `surface-card / panel-card / data-tile / surface-chip / status-badge` を小さい R に統一
- `WorkspaceStatusNotice / WorkspaceEmptyState / WorkspaceLoadingCard` を shared radius に揃えた
- `div / section / article / aside / details` の `rounded-xl / rounded-2xl / rounded-3xl` を static surface 向けに軽く補正
- button / link 系の radius は維持
