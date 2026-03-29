# SEO / AI Agent Discovery Playbook

最終更新: 2026-03-28

## 目的

Creator Founding の公開面を、

- 検索エンジンに見つけてもらいやすくする
- AI エージェントが public surface を安全に理解しやすくする
- アプリ利用者には AI Office を「AI コンシェルジュ」として案内する

ための実装方針を整理する。

## 実装した入口

- [`/Users/shounokazuaki/cf/app/layout.tsx`](/Users/shounokazuaki/cf/app/layout.tsx)
  - サイト全体 metadata を強化
- [`/Users/shounokazuaki/cf/app/robots.ts`](/Users/shounokazuaki/cf/app/robots.ts)
  - crawler 向け robots
- [`/Users/shounokazuaki/cf/app/sitemap.ts`](/Users/shounokazuaki/cf/app/sitemap.ts)
  - public page sitemap
- [`/Users/shounokazuaki/cf/app/llms.txt/route.ts`](/Users/shounokazuaki/cf/app/llms.txt/route.ts)
  - AI agent 向けの入口ファイル
- [`/Users/shounokazuaki/cf/app/llms-full.txt/route.ts`](/Users/shounokazuaki/cf/app/llms-full.txt/route.ts)
  - public URL pattern と public API field を説明する拡張ガイド
- [`/Users/shounokazuaki/cf/docs/specs/operations/public-creator-api-contract.md`](/Users/shounokazuaki/cf/docs/specs/operations/public-creator-api-contract.md)
  - `/api/public/creator` の response contract
- [`/Users/shounokazuaki/cf/docs/specs/operations/public-api-index.md`](/Users/shounokazuaki/cf/docs/specs/operations/public-api-index.md)
  - public API surface の一覧
- [`/Users/shounokazuaki/cf/docs/specs/operations/public-viewer-api-contract.md`](/Users/shounokazuaki/cf/docs/specs/operations/public-viewer-api-contract.md)
  - same-origin helper としての `/api/public/viewer` contract
- [`/Users/shounokazuaki/cf/app/public-api-examples/route.ts`](/Users/shounokazuaki/cf/app/public-api-examples/route.ts)
  - public API example payload の静的 JSON 入口
- [`/Users/shounokazuaki/cf/lib/seo/publicProfileStructuredData.ts`](/Users/shounokazuaki/cf/lib/seo/publicProfileStructuredData.ts)
  - 公開プロフィール JSON-LD と BreadcrumbList / FAQPage
- [`/Users/shounokazuaki/cf/lib/seo/publicProfileFaq.ts`](/Users/shounokazuaki/cf/lib/seo/publicProfileFaq.ts)
  - 公開プロフィールの visible FAQ と FAQ structured data の共通 source
- [`/Users/shounokazuaki/cf/app/creators/page.tsx`](/Users/shounokazuaki/cf/app/creators/page.tsx)
  - filter-aware metadata
- [`/Users/shounokazuaki/cf/lib/seo/creatorDiscoveryStructuredData.ts`](/Users/shounokazuaki/cf/lib/seo/creatorDiscoveryStructuredData.ts)
  - creators 一覧の CollectionPage / ItemList / BreadcrumbList

## ルール

- public support surface だけを discoverable にする
- mypage / manager-desk / API 書き込み系は discoverability の主対象にしない
- 送金、bridge、distribution、settlement は AI 自動実行の対象として扱わない
- AI Office は「自動執行者」ではなく「コンシェルジュ / 参謀 / 整理役」として案内する
- query で意味が変わる public list は title / description / canonical / JSON-LD の URL をそろえる
- public profile は ProfilePage だけでなく BreadcrumbList も付けて、一覧からの文脈を機械可読にする
- structured data に載せる FAQ は、実際に画面へ出している文言と同じ source から生成する
- AI agent 向けテキスト入口は `llms.txt` を短い index、`llms-full.txt` を詳細ガイドとして役割分担する

## UI 方針

- onboarding と Creator Home に AI コンシェルジュ案内を置く
- AI の価値は「次にやることを迷わない」に寄せる
- 本文の主要操作を別メニューへ逃がさない
- 接続前は右上ウォレット、接続後は文脈内 CTA を基本とする

## 今後の伸びしろ

- Search Console / Bing Webmaster Tools 前提の検証手順を runbook 化
- AI concierge の task recommendation を onboarding 段階からもっと明示する
- creators filter ごとの説明文を、件数や最新活動に応じてもう少し動的にする
- public profile FAQ を支援実績や対応通貨に応じてもう少し具体化する
- public creator API の response contract を docs 化し、AI agent からの参照先を増やす
