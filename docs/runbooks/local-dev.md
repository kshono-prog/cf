# Local Dev Runbook

## 目的

ローカル開発を再現しやすくし、AI も人も同じ手順で確認できるようにする。

## 前提

- `.env` / `.env.local` が設定済み
- `node_modules` が存在する
- DB 接続情報が有効

## 基本コマンド

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## 開発時の確認順

1. lint
2. type check
3. 対象画面の手動確認
4. 対象 API の正常系確認

## 注意

- migration や schema 変更は勝手に進めない
- 送金系や bridge 系は UI だけでなく API 側も確認する
- env var を前提にした変更は docs に記録する

