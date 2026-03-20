# Release Checklist

## 必須

- `npm run verify`
- 変更対象画面の確認
- 変更対象 API の確認
- public 重要導線を触った場合は `npm run measure:public-pages`

## 要確認

- env var 変更
- migration 変更
- migration を触った場合は `npm run verify:prisma`
- Goal / Project / CreatorProfile を触った場合は `npm run audit:data-integrity`
- task type 追加
- bridge / settlement / distribution 変更

## リリースメモ

- 変更概要
- リスク
- 未確認事項
- 必要な追跡タスク
