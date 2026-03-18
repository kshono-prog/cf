# Task

Phase 1 UX: `sns` 内部命名を `posting` 系へ寄せる軽量 rename 計画

## Goal

Creator Founding 内の投稿機能を指す内部命名について、`sns` 由来の曖昧さを減らし、`posting` 系へ段階的に寄せる。

## Why

- 現在の AI Office と投稿導線は、外部SNS連携ではなく `Creator Founding` 内投稿を中心にしている
- `sns` という内部名が残っていると、外部SNSリンクや social profile 機能と混同しやすい
- 一方で route / API / hook 名を一気に変えると差分が大きくなり、既存導線を壊しやすい

## Scope

- rename 対象を `internal posting surface` に限定する
- 段階的 rename の波を定義する
- compatibility を保つための alias / shim 方針を決める
- 実装前に `残してよい SNS` と `rename すべき sns` を切り分ける

## Non-Goals

- 一度の PR で route / API / file path を全置換すること
- 外部リンクとしての `SNSリンク` 文言を消すこと
- 既存の `app/api/social/*` や creator profile の social 構造をなくすこと

## Rename Policy

`残してよい SNS`

- creator profile の `SNSリンク`
- public profile の social icon / social link
- domain-model 上の social connection そのもの

`posting` に寄せる対象

- `Creator Founding` 内投稿機能
- 投稿 composer / 投稿一覧 / analytics / AI事務所との結合面
- `support-page` 内の accordion / anchor / local state 名

## Suggested Waves

### Wave 1: Local Naming and Labels

対象:

- variable 名
- component prop 名
- anchor id
- loading title / section title / helper copy

例:

- `isSnsOpen` -> `isPostingOpen`
- `composeHref` -> `postingHref`
- `#sns-compose` -> `#posting-compose`
- `SNS・AI事務所` -> `投稿・AI事務所`

完了条件:

- user-facing copy に `internal posting surface` を指す `SNS` が残らない
- 既存 route と挙動は変わらない

### Wave 2: Component and Helper Names

対象:

- `SnsAiOfficeSection`
- `SnsProjectOption`
- `lib/mypage/snsApi.ts`

方針:

- 新しい `posting` 名を先に作る
- 旧名は re-export または compatibility alias にする
- `1 PR = 1 rename slice` で進める

完了条件:

- 新規実装が `sns` 名へ依存しない
- 既存 import は段階移行できる

### Wave 3: Route and API Compatibility

対象:

- `app/api/mypage/sns/*`
- `lib/mypage/snsApi.ts` が叩く endpoint

方針:

- 先に `/api/mypage/posting/*` alias を足す
- client 側を切り替えた後、旧 route の扱いを判断する
- high-risk ではないが diff が広いので別 task に分ける

完了条件:

- route 変更が UI と独立して review できる
- 既存 deep link や bookmark を壊さない

### Wave 4: Canonical Posting Entry Points

対象:

- `components/mypage/PostingAiOfficeSection.tsx`
- `lib/mypage/postingManagedApi.ts`
- legacy `sns` file の compatibility re-export

方針:

- `posting` 名の正規 file path を先に作る
- 旧 `sns` file は薄い shim として残す
- 新規 import は `posting` 側へ統一する

完了条件:

- 新規コードが `@/components/mypage/SnsAiOfficeSection` に依存しない
- `postingApi.ts` が `snsApi.ts` の型名へ直接依存しない
- 既存 compat import は壊れない

## Candidate File Buckets

- `components/mypage/CreatorReadyAccountView.tsx`
- `components/mypage/CreatorReadySupportPageRoute.tsx`
- `components/mypage/PostingAiOfficeSection.tsx`
- `components/mypage/SnsAiOfficeSection.tsx`
- `components/mypage/PostComposerCard.tsx`
- `components/mypage/MyPostsCard.tsx`
- `components/mypage/AnalyticsSummaryCard.tsx`
- `components/mypage/AiAgencyCard.tsx`
- `lib/mypage/postingManagedApi.ts`
- `lib/mypage/snsApi.ts`
- `app/api/mypage/sns/*`

## Acceptance Criteria

- rename 対象と非対象が文書で分かれている
- route / API を一気に変えない段階計画がある
- Wave 1 から安全に着手できる
- AI Office / posting 面の今後の task で参照できる

## Risks

- domain 上の `social` と internal posting surface を同時に触ると意図がぶれる
- file path rename を早くやりすぎると review と rollback が重くなる
- route rename を先にやると bookmark や internal links を壊しやすい

## Validation

- docs 差分レビュー
- `rg` で rename 対象と非対象の残り方を確認
- Wave 1 実装時は `npm run lint`, `npm run typecheck`, `npm run build`
