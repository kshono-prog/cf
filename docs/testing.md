# Testing Guide

## 目的

このプロジェクトでは、既存挙動を壊さずに UI 回帰を早く検知し、failure artifact から AI / 人間のどちらでも直しやすい状態を保つことを目的にしています。

## テスト階層

- `unit`: 純粋関数と軽量コンポーネントの回帰防止
- `e2e smoke`: 公開ページと `mypage` の主要導線が壊れていないことの確認

非同期 Server Components を含む主要導線は、まず E2E スモークで守る方針です。

## Mock 方針

- E2E は `tests/e2e/fixtures/mockApi.ts` の route mock を優先して使う
- 外部ウォレットの実接続は使わない
- 本物 RPC や外部送金フローには依存しない
- 送金、reverify、distribution などの高リスク領域は実ネットワークで検証しない
- dev-only の `e2eMock` 補助はローカル検証安定化のために限定利用する

## Flaky 防止

- 文言一致だけに頼らず、必要最小限の `data-testid` を使う
- 1 spec で広すぎる責務を持たせず、公開ページ / userOnly / creatorReady など状態別に分ける
- 成功判定は toast よりも、画面状態やレスポンス反映の確認を優先する
- retry は CI のみ 1 回、local は 0 回にする

## AI 修正ルール

- 変更対象は UI / テスト基盤 / 開発スクリプト / CI に限定する
- Prisma schema の変更は禁止
- route の副作用やオンチェーン実行ロジックは変更しない
- failing spec 単位で直す
- テストを通すためだけの本番ロジック改変は避ける
- まず artifact と失敗ログから原因を特定し、最小差分で修正する

## Failure Artifact の見方

1. GitHub Actions の job summary と失敗 comment を見る
2. `playwright-report/` の HTML report を開く
3. failing test の trace を確認する
4. screenshot / video で見た目の崩れを確認する
5. failing diff や console error を照合する

## ローカル実行コマンド

- `npm run test:unit`
- `npm run test:unit:watch`
- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:ci`

## CI

- `.github/workflows/test.yml` が `push` / `pull_request` で実行される
- 失敗時は Playwright report と test results を artifact として保存する
- `.github/workflows/ai-fix-comment.yml` が failure summary を PR comment に整形して残す
