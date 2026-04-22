# PublicArticle Foundation Design

作成: 2026-04-11
対象: `/{username}` 公開プロフィールを「無料の creator microsite」に育てるための blog 基盤

## Summary

公開プロフィールの拡張として、`/{username}/blog` 配下に **クリエイター専用ブログ** を提供する。

最初のゴールは「高品質・軽量・安全」で、

- creator が自分の活動を時系列で残せる
- supporter が活動の背景を追える
- 公開プロフィールの価値が積み上がる

状態を作ること。

## Goals

- creator ごとに記事一覧 `/{username}/blog` と記事詳細 `/{username}/blog/[slug]` を提供
- 記事は `DRAFT / PUBLISHED` を持つ
- 公開ページのクリティカルパスを崩さない（read model / cache 前提）
- 任意 HTML/CSS/JS の埋め込みは許可しない（XSS・品質劣化防止）

## Non-Goals (Phase 1)

- 汎用 CMS / 多人数編集 / コメント
- 外部埋め込みの自由配置（Notion のような page builder）
- SEO を完全最適化する全機能（RSS/OG カスタムなどは後回し）
- 有料課金や購読（まずは無料機能として定着させる）

## Data Model (Proposal)

### Prisma model: `PublicArticle`

- `id`: `BigInt @id @default(autoincrement())`
- `creatorProfileId`: `BigInt` (FK)
- `slug`: `String` (creator 単位でユニーク)
- `title`: `String`
- `excerpt`: `String?` (一覧カード用)
- `coverImageUrl`: `String?`
- `contentMarkdown`: `String @db.Text`
- `status`: `String @default("DRAFT")` (`DRAFT` / `PUBLISHED`)
- `publishedAt`: `DateTime? @db.Timestamptz(6)`
- `createdAt` / `updatedAt`
- Index:
  - `@@index([creatorProfileId, publishedAt])`
  - `@@unique([creatorProfileId, slug])`

注意:
- `contentHtml` の保存は最初は不要。表示時に server-side で markdown -> safe HTML へ変換する。
- `slug` は owner が入力してもよいが、まずは `title` から生成 + 衝突回避を推奨。

## Public Routes

- `/{username}/blog`
  - 記事一覧（PUBLISHED のみ）
  - cover / title / excerpt / publishedAt
- `/{username}/blog/[slug]`
  - 記事本文（PUBLISHED のみ）
  - OG / metadata は creator + article で構成

## Owner Routes / UI

### Minimal UI

- mypage `settings` に `ブログ` セクションを追加
  - 記事一覧（下書き/公開）
  - `新規作成`
  - `編集`
  - `公開/下書きに戻す`

### Editor

- `title`
- `slug` (optional)
- `excerpt` (optional)
- `coverImageUrl` (optional)
- `contentMarkdown`
- preview（markdown render）

## Rendering / Safety

- markdown renderer は allowlist 方式
  - links, lists, headings, code block などの基本のみ
  - raw HTML は禁止または sanitize 必須
- `coverImageUrl` は http(s) のみ許可

## Performance / Caching

- `/{username}` のクリティカルパスに blog full list を混ぜない
  - 公開プロフィールに出す場合は「最新 1〜3 件の preview」だけを deferred section として取得
- `/{username}/blog` は `unstable_cache` + revalidate（例: 120s）
- `/{username}/blog/[slug]` も同様に cache 可能（更新時 invalidate が必要）

## API (Optional, Phase 1)

server actions でも route handler でもよいが、現行の mypage 方式に合わせるなら:

- `POST /api/articles` (create)
- `PATCH /api/articles/[id]` (update/publish)
- `GET /api/creators/[username]/articles` (public list)

ただし Phase 1 は App Router の server component 直 fetch でも成立する。

## Acceptance Criteria (Phase 1)

- owner が mypage で記事を作成し、PUBLISHED にできる
- `/{username}/blog` で公開記事一覧が表示される
- `/{username}/blog/[slug]` で公開記事が表示される
- DRAFT は public から見えない
- 公開プロフィール `/{username}` の初期表示を悪化させない

## Rollout Plan

1. Prisma schema + migration
2. 公開閲覧（list/detail）を先に実装
3. owner editor を追加
4. 公開プロフィールへの preview セクション（deferred）を追加
5. SEO/RSS/OG などを必要に応じて拡張

