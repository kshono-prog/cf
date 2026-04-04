# UXF-3: mobile section を full-width band にし、user avatar は円形を維持する

## 背景

`UXF-2` で non-clickable surface を square に寄せたことで、section の区切りは明確になった一方、mobile では card 感がまだ強く、画面横幅を使い切れていない。

また、avatar placeholder のような non-clickable user icon まで square に寄ってしまう箇所がある。

## 目的

- user avatar は引き続き円形にする
- mobile では top-level section を full-width band に寄せる
- section の区切りを保ちながら、狭い画面で横幅を有効活用する

## 非目的

- 導線や CTA の変更
- desktop layout の全面刷新
- API / state / auth behavior の変更

## 対応方針

1. `avatar-circle` utility を追加し、shared avatar と主要 profile surface に適用する
2. mobile では `section/article` ベースの `surface-card / panel-card / sheet-section` を full-bleed band にする
3. box-shadow と左右 border を減らし、mobile で section を読みやすくする

## 完了条件

- user avatar が円形で表示される
- mobile で主要 section が画面横幅をより使う
- section の区切りが視認しやすい

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## 完了メモ

- `avatar-circle` utility を追加し、shared avatar と主要 profile/user surface に適用
- mobile では `section/article` ベースの `surface-card / panel-card / sheet-section` を full-width band に変更
- mobile 時は左右 border と shadow を抑え、狭い画面でも section の横幅を使いやすくした
