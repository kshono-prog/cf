# UXF-4: line-divided section language で professional な見た目へ寄せる

## 背景

`UXF-2` と `UXF-3` により static surface の square 化と mobile full-width 化は進んだが、まだ section や badge が「枠物」に見える箇所が多い。

今回の要望は、ユーザーアイコンは円形を維持しつつ、section は line で区切る professional な見た目へ一段進めること。

## 目的

- top-level section を box ではなく line-divided な帯に寄せる
- sub-surface も full box ではなく strip / divider ベースへ寄せる
- user avatar は丸アイコンを維持する

## 非目的

- IA や導線の変更
- interaction behavior の変更
- auth / chain / settlement まわりの挙動変更

## 対応方針

1. `surface-card / panel-card / sheet-section` を border-top / border-bottom ベースに変更
2. `surface-subtle / compact-info-card / data-tile` を left divider strip に変更
3. `surface-chip / status-badge / WorkspaceFeedback` を box から line-based expression に変更
4. avatar round rule を shared CSS でも補強する

## 完了条件

- user avatar が円形で表示される
- top-level section が line-divided に見える
- boxed すぎる badge / notice / support block が減る

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## 完了メモ

- `surface-card / panel-card / sheet-section` を line-divided な帯表現へ変更
- `surface-subtle / compact-info-card / data-tile / status-badge / surface-chip` を box ではなく divider / line ベースに変更
- avatar round rule を shared CSS 側でも補強し、ユーザーアイコンの円形表示を維持
