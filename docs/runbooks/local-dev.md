# Local Dev Runbook

## 目的

ローカル開発を再現しやすくし、AI も人も同じ手順で確認できるようにする。

## 前提

- `.env` / `.env.local` が設定済み
- 初回セットアップ時は `.env.example` をコピーして不足分を埋める
- `node_modules` が存在する
- DB 接続情報が有効

## 基本コマンド

```bash
cp .env.example .env.local
npm run dev
npm run verify
npm run verify:prisma
npm run measure:public-pages
npm run audit:data-integrity
```

## 開発時の確認順

1. `npm run verify`
2. Prisma / migration を触ったときだけ `npm run verify:prisma`
3. 対象画面の手動確認
4. 対象 API の正常系確認
5. public 重要導線を触ったときは `docs/runbooks/public-surface-measurement.md`
6. Goal / Project / CreatorProfile を触ったときは `docs/runbooks/data-integrity-audit.md`

AI Office を触るとき:

1. `docs/specs/creator-ai-office/task-output-contracts.md` を確認する
2. `docs/runbooks/ai-office-manual-check.md` の対象 task を手動確認する

## 注意

- migration や schema 変更は勝手に進めない
- 送金系や bridge 系は UI だけでなく API 側も確認する
- env var を前提にした変更は docs に記録する
- `lib/env.ts` と `lib/publicEnv.ts` で必須 env は fail-fast するので、build/test が早い段階で落ちたら env 名を確認する
- `typecheck` は `next typegen` を先に実行するので、単体でも確認できる
- cross-origin surface を触るときは `CORS_ALLOWED_ORIGINS` に dev / staging / prod の origin を明示する
