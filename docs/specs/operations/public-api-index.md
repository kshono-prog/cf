# Public API Index

最終更新: 2026-03-28

## 目的

Creator Founding の public-facing API surface を一覧し、

- どの endpoint が外部 AI / crawler 向けに扱えるか
- どの endpoint が same-origin 限定か
- どの contract doc を見ればよいか

を揃える。

## 基本方針

- public API は read-only に限定する
- 送金、bridge、distribution、settlement のような高リスク操作は public API にしない
- external AI が参照してよいものと、same-origin helper を分けて扱う

## Endpoint 一覧

| Path | 用途 | 外部 AI / crawler | Contract |
| --- | --- | --- | --- |
| `/api/public/creator?username={username}` | 公開 creator summary と project summary の取得 | 可 | [Public Creator API Contract](/Users/shounokazuaki/cf/docs/specs/operations/public-creator-api-contract.md) |
| `/api/public/viewer?address={wallet}` | 同一 origin 上での viewer identity / owner 判定補助 | 不可 | [Public Viewer API Contract](/Users/shounokazuaki/cf/docs/specs/operations/public-viewer-api-contract.md) |
| `/public-api-examples` | public API の静的 example payload | 可 | [`/Users/shounokazuaki/cf/lib/publicApiExamples.ts`](/Users/shounokazuaki/cf/lib/publicApiExamples.ts) |

## 使い分け

### `/api/public/creator`

使う場面:

- public profile を開く前に軽量な要約を読みたい
- creator discovery から候補の public project 状況を確認したい
- AI agent が public creator を理解する前処理をしたい

読まない場面:

- internal workflow の代替
- wallet 接続や応援送信の自動化

### `/api/public/viewer`

使う場面:

- same-origin の public page で、viewer が owner かどうかや creator 状態を補助判定したい
- connected wallet に紐づく local UI branching をしたい

読まない場面:

- crawler / external AI / cross-origin consumer
- public documentation 的な profile 要約

## 関連 public surface

- public page:
  [`/Users/shounokazuaki/cf/app/[username]/page.tsx`](/Users/shounokazuaki/cf/app/[username]/page.tsx)
- creator discovery:
  [`/Users/shounokazuaki/cf/app/creators/page.tsx`](/Users/shounokazuaki/cf/app/creators/page.tsx)
- AI agent entry:
  [`/Users/shounokazuaki/cf/app/llms.txt/route.ts`](/Users/shounokazuaki/cf/app/llms.txt/route.ts)
- extended AI agent guide:
  [`/Users/shounokazuaki/cf/app/llms-full.txt/route.ts`](/Users/shounokazuaki/cf/app/llms-full.txt/route.ts)
