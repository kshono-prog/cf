# Public Profile Customization Platform Plan

作成: 2026-04-11
対象: `/[username]` 公開プロフィール

## Summary

公開プロフィールを単なる「支援ページ」から、クリエイターごとの個性と活動導線を高品質に表現できる
`Public Page Platform` へ進化させる。

目指すのは、雑多な自由度の高いページビルダーではなく、

- クリエイター活動に必要な情報を
- 高いデザイン品質を保ちながら
- owner が迷わず編集できて
- supporter にとっても分かりやすい

という条件を満たす、**ガードレール付きのカスタマイズ基盤** である。

将来的には、

- トップ画像
- 背景トーン / テーマ
- セクション順序
- 表示 / 非表示
- ブログ
- オリジナルの紹介ページ群

まで扱える「無料の creator microsite」に育てる。

## Why Now

現在の公開プロフィールは、[Architecture](/Users/shounokazuaki/cf/docs/architecture.md) 上でも
`public support surface` として整理されており、支援導線・進捗表示・投稿・信頼要素がすでに存在する。

一方で、現状のカスタマイズ余地はほぼ以下に限られる。

- `displayName`
- `profileText`
- `avatarUrl`
- `externalUrl`
- `themeColor`
- SNS / YouTube

参照:
- [prisma/schema.prisma](/Users/shounokazuaki/cf/prisma/schema.prisma)
- [CreatorProfileEditPublicPageSection.tsx](/Users/shounokazuaki/cf/components/mypage/CreatorProfileEditPublicPageSection.tsx)
- [PublicProfilePageBodyServer.tsx](/Users/shounokazuaki/cf/components/profile/PublicProfilePageBodyServer.tsx)

この状態では、

- 表現の幅が足りない
- 多様な creator が参加する装置としての魅力が弱い
- 「自分のページとして育てる」動機が弱い
- SNS / ポートフォリオ / ブログ的な役割を十分に担えない

という課題がある。

## Product Positioning

### 何を作るか

`Creator Founding Public Page Platform`

クリエイターが自分の活動を見せ、支援を受け、更新を積み重ねられる
**creator-first な公開ページ基盤**。

### 何を作らないか

最初から以下は狙わない。

- ノーコードの汎用 Web サイトビルダー
- 任意 HTML / 任意 CSS / 任意 JavaScript の埋め込み
- 完全自由配置の drag-and-drop page builder
- 大規模 CMS / 汎用ブログサービス

理由:

- 品質が崩れやすい
- パフォーマンスが悪化しやすい
- public surface の一貫性と trust を損ないやすい
- owner の編集負荷が高すぎる

## Design Principles

### 1. High-quality by default

自由度より先に、**初期状態でも十分に魅力的** であることを優先する。

- blank canvas にしない
- curated themes を出す
- section variants を限定する
- safe typography / spacing / color rules を持つ

### 2. Customizable without breaking trust

表現は自由にしてよいが、支援導線や信頼情報は壊さない。

- support CTA は見失わせない
- project / progress / trust signal は消せても「代わりに何を見せるか」を設計する
- AI disclosure や safety-related な public info はルールを守る

### 3. Modular, not ad hoc

`themeColor` のような単発フィールド追加を繰り返さず、
**page config + section registry** の形に寄せる。

### 4. Server-first public rendering

公開ページは今後さらに重くなるため、
既存の [public-surface-performance-playbook](/Users/shounokazuaki/cf/docs/runbooks/public-surface-performance-playbook.md)
に沿って、server-first / read-model-first / deferred-first を守る。

### 5. One-page first, multi-page later

まずは高品質な single-page profile を作る。
ブログや独自ページ群はその上に積む。

## Target Experience

owner 視点:

1. テーマを選ぶ
2. トップ画像と背景トーンを決める
3. 表示したいセクションを選ぶ
4. 順番を整える
5. 投稿やブログ記事を載せる
6. PC / mobile preview を確認して公開する

visitor 視点:

1. 一目で creator の空気感が伝わる
2. 活動内容 / 実績 / 作品 / 支援先が迷わず分かる
3. 必要に応じてブログ / リンク / イベント / 応援導線へ自然につながる

## Scope Decomposition

### Layer A: Visual Customization

扱うもの:

- hero cover image
- page background tone
- surface style
- accent color
- typography preset
- avatar presentation

狙い:

- creator ごとの第一印象を変えられる
- ただし品質と可読性は担保する

### Layer B: Layout Customization

扱うもの:

- section order
- section visibility
- hero variant
- sidebar / right rail emphasis
- featured block priority

狙い:

- 「支援重視」「作品重視」「コミュニティ重視」などの見せ方を変えられる

### Layer C: Content Modules

扱うもの:

- intro
- featured links
- YouTube
- events
- project / support
- testimonials
- supporter wall
- activity heatmap
- trust / revenue / stage
- team
- external wallet QR
- blog preview

狙い:

- creator ごとに必要な情報だけを出せる

### Layer D: Publishing Surface Expansion

扱うもの:

- blog / article
- custom landing page sections
- simple page navigation
- original microsite-like structure

狙い:

- 「プロフィール」から「活動サイト」へ広げる

## Recommended Architecture

### 1. `CreatorProfile` に積み続けない

現在の `CreatorProfile` はプロフィール属性の置き場所としては適切だが、
今後の page customization をここへ足し続けるのは不向き。

避けたいもの:

- `coverImageUrl`
- `backgroundStyle`
- `showSupporterWall`
- `showBlog`
- `sectionOrderJson`
- `heroVariant`

のような ad hoc fields の増殖。

### 2. 新しい中心: `PublicPageConfig`

推奨:

- `PublicPageConfig`
- `PublicPageSectionConfig`
- 必要なら `PublicPageThemePreset`
- 将来的に `PublicPageAsset`

という additive モデルを持つ。

最低限の責務:

- creator 単位の公開ページ設定
- visual theme
- section visibility / order
- hero settings
- version / updatedAt

### 3. Section registry 方式

表示単位を「if 文の塊」で増やさず、`sectionType` ベースに整理する。

例:

- `HERO`
- `SUPPORT`
- `POSTS`
- `EVENTS`
- `YOUTUBE`
- `SUPPORTER_WALL`
- `TESTIMONIALS`
- `TEAM`
- `BLOG_PREVIEW`
- `EXTERNAL_LINKS`
- `TRUST`
- `AI_MANAGER`

各 section は以下を持つ:

- `type`
- `enabled`
- `order`
- `variant`
- `settingsJson`

### 4. Public read model で assembly

公開ページの request 時に UI が個別に判断しない。

既存の
- [loadPublicProfilePageReadModel](/Users/shounokazuaki/cf/lib/publicProfilePageReadModel.ts)

へ、

- page config
- visible sections
- theme config
- section-level data availability

を組み込んで、**assembled public payload** として返す。

### 5. Snapshot / cache friendly にする

将来は customization が増えるため、public request ごとに DB join を増やしすぎない。

中期で検討:

- public page snapshot
- theme + section config の cache key
- editor save 時の revalidation

## Data Model Proposal

### Phase 1 minimum

`PublicPageConfig`

- `id`
- `creatorProfileId`
- `themePreset`
- `accentColor`
- `backgroundTone`
- `coverImageUrl`
- `heroVariant`
- `showBlogPreview`
- `showExternalLinks`
- `showEvents`
- `showSupport`
- `showPosts`
- `showAiManager`
- `updatedAt`

これは移行しやすいが、boolean が増えやすい。

### Recommended near-future model

`PublicPageConfig`

- `id`
- `creatorProfileId`
- `themePreset`
- `accentColor`
- `backgroundTone`
- `coverImageUrl`
- `heroVariant`
- `navStyle`
- `version`
- `publishedAt`
- `updatedAt`

`PublicPageSectionConfig`

- `id`
- `publicPageConfigId`
- `sectionType`
- `enabled`
- `order`
- `variant`
- `settingsJson`

### Migration philosophy

- additive only
- existing `themeColor` は phase 1 では fallback として併存
- rollback 時は `PublicPageConfig` がなくても現行 page が成立するようにする

## UX Plan: Owner Editing

### New editing surface

`Public Page Studio`

置き場所:

- 既存 `mypage/settings` 配下の `公開ページ` セクションを発展
- phase 1 は settings 内
- phase 2 以降で dedicated route 化を検討

### Studio tabs

#### 1. Theme

- theme preset
- accent color
- background tone
- cover image
- avatar framing

#### 2. Layout

- section list
- drag-to-reorder
- show / hide toggle
- hero emphasis mode

#### 3. Content

- intro / featured links
- creator voice
- featured video
- blog preview source

#### 4. Preview

- desktop preview
- mobile preview
- “現在公開中との差分” 確認

### Guardrails

- contrast check
- cover image crop preview
- required sections warning
- empty section warning
- “support CTA が下に沈みすぎる” 警告

## UX Plan: Visitor Side

### Hero redesign

hero は今後の変化の中心。

phase 1 で扱う候補:

- `Support Hero`
- `Story Hero`
- `Portfolio Hero`

ただし variant は 2〜3 個に限定する。

### Right rail policy

右カラムは補助情報ではなく、

- QR
- trust
- AI manager
- support action
- links

のような secondary utility rail として再整理する。

### Anchor nav policy

section visibility / order と連動して動的生成する。

## Blog / Microsite Expansion Plan

### Phase 1

既存 Post をブログとしては扱わない。
まずは `blog preview card` の入口だけを想定する。

理由:

- 投稿 feed とブログ記事は UX 期待が違う
- feed の短文性と article の長文性は別設計が必要

### Phase 2

`PublicArticle`

- `creatorProfileId`
- `slug`
- `title`
- `excerpt`
- `coverImageUrl`
- `body`
- `status`
- `publishedAt`

用途:

- ブログ
- 活動報告
- コラム
- 作品解説

URL:

- `/{username}/blog`
- `/{username}/blog/{slug}`

### Phase 3

simple microsite navigation

- `Home`
- `Blog`
- `Events`
- `About`

この段階で初めて「無料で持てる creator site」感が成立する。

## Execution Roadmap

### Phase 0: Strategy / IA / design system alignment

目的:

- 何でもできる builder にしない
- “quality-first な creator page platform” の原則を固定する

やること:

1. public page の section inventory を作る
2. section を `core / optional / experimental` に分類
3. theme presets の方向性を決める
4. editor IA を定義する

成果物:

- section registry proposal
- theme system proposal
- Public Page Studio IA

### Phase 1: Visual customization MVP

目的:

- 見た目の差分を大きくしつつ、実装リスクを抑える

scope:

- cover image
- accent / background tone
- hero variant
- section visibility
- section order
- preview

non-goals:

- blog
- custom pages
- arbitrary embeds

成功条件:

- creator が「自分のページ感」を強く持てる
- supporter から見ても quality が落ちない

### Phase 2: Modular content customization

scope:

- featured links
- testimonials
- supporter wall
- events emphasis
- YouTube emphasis
- right rail composition

成功条件:

- creator type に応じて情報の重心を変えられる

### Phase 3: Blog foundation

scope:

- article model
- blog index
- article page
- blog preview module

成功条件:

- creator が CF 上で継続更新する理由が増える

### Phase 4: Microsite layer

scope:

- simple page navigation
- custom page grouping
- about / links / event landing composition

成功条件:

- 「プロフィール」ではなく「creator website」と呼べる

## Prioritized Build Order

### Immediate

1. Public Page Platform 構想書
2. section registry / config model の issue 化
3. Theme + Layout MVP issue 分解

### First implementation slice

1. top image
2. theme preset
3. background tone
4. section visibility
5. section order
6. preview

### After MVP proves value

7. blog foundation
8. microsite navigation

## Metrics

編集導線:

- public page customization completion rate
- preview open rate
- publish rate
- cover image adoption rate
- theme preset adoption rate

公開成果:

- public page share rate
- time on profile
- first support conversion
- profile revisit rate
- article publish frequency

定性:

- creator が「これなら自分のページとして使える」と感じるか
- generic page に見えないか
- supporter が迷わず支援導線へ行けるか

## Main Risks

### 1. 自由度を上げすぎて質が落ちる

対策:

- curated presets
- section variants 制限
- arbitrary CSS/JS 禁止

### 2. public performance が悪化する

対策:

- read model assembly
- server-first hero
- deferred lower sections
- config snapshot / cache strategy

### 3. editor が複雑すぎる

対策:

- phase 1 は theme + order + visibility に絞る
- blank canvas にしない

### 4. support surface の意味がぼやける

対策:

- support CTA の visibility rules
- creator type ごとに recommended layout を用意

## Recommendation

このテーマは、単発の「トップ画像追加」や「表示順編集」ではなく、
**Public Page Platform の最初の設計問題** として扱うべき。

最適な進め方は、

1. phase 1 を `Theme + Layout MVP` に限定する
2. `PublicPageConfig` を additive に導入する
3. section registry を作る
4. blog / microsite は phase 2 以降に切る

である。

## Suggested Next Docs

この後すぐ作るべき文書:

1. `Public Page Platform` 構想書
2. `PublicPageConfig / PublicPageSectionConfig` schema proposal
3. `Theme + Layout MVP` issue
4. `Public Page Studio` information architecture
