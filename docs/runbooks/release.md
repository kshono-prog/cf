# Release Runbook

## 目的

個人開発でも最低限のリリース確認を漏らさないようにする。

## リリース前チェック

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. 変更対象画面の手動確認
5. 変更対象 API の異常系確認
6. env var 変更有無の確認
7. migration 変更有無の確認

## 特に注意する領域

- settlement
- bridge
- distribution
- creator profile 更新
- AI task の task type 追加

## リリースノートに残すこと

- 何が変わったか
- どこに影響するか
- 未確認事項
- ロールバックしづらい変更の有無

