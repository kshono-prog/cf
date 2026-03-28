# Public Surface Performance Playbook

## 目的

`/{username}` と `/creators` を中心とした public surface で、`TTFB` と「最初に意味のある UI が見えるまでの時間」を継続的に下げるための運用知見を残す。

## 2026-03-28 時点の症状

- Chrome の `Network` では `/{username}?_rsc=...` が `13s - 15s` 台で支配的だった
- 表示後も `follow / viewer / feed` の追加 fetch が `3s - 9s` かかり、体感を悪化させていた
- production response header は `cache-control: private, no-cache, no-store` と `x-vercel-cache: MISS` で、public route が毎回 dynamic path として処理されていた
- local build では public profile prerender 中に Prisma pool timeout が起き、`DATABASE_TEMPORARILY_UNAVAILABLE` で build が落ちることがあった

## まず確認すること

### 1. 実際に遅いのが server か client か

- Chrome `Network` で最長 request を見る
- `Doc` と `fetch/XHR` を分けて見る
- `Console` で hydration / chunk / failed fetch を確認する

典型パターン:

- `/_rsc` が長い: server render / DB / region / dynamic rendering が主因
- `/_rsc` は短いが `follow / viewer / feed` が長い: mount 後 fetch のウォーターフォールが主因

### 2. response header を見る

```bash
curl -I -s https://<deployment-host>/<username>
```

確認ポイント:

- `cache-control`
- `x-vercel-cache`
- `x-vercel-id`
- `x-matched-path`

`private, no-cache, no-store` と `MISS` が続くなら、public page が shared cache に乗っていない可能性が高い。

### 3. dev と production を混ぜない

- `next dev` の cold は compile が混ざる
- `next start` の測定を baseline にする
- 同条件の比較には [`docs/runbooks/public-surface-measurement.md`](/Users/shounokazuaki/cf/docs/runbooks/public-surface-measurement.md) を使う

## 今回効いた施策

### 1. public page の assembled read model を作る

対象:

- [`lib/publicProfilePageReadModel.ts`](/Users/shounokazuaki/cf/lib/publicProfilePageReadModel.ts)

ポイント:

- page 本体で必要な `pageData / initialFeed / credibility` をまとめて読む
- route 側で helper を何本も直列に呼ばない
- warm path は hot cache を使う

### 2. stale / generic fallback を許容する

対象:

- [`lib/creatorProfile.ts`](/Users/shounokazuaki/cf/lib/creatorProfile.ts)
- [`lib/publicPageData.ts`](/Users/shounokazuaki/cf/lib/publicPageData.ts)
- [`lib/feedList.ts`](/Users/shounokazuaki/cf/lib/feedList.ts)
- [`lib/publicProfileMetadata.ts`](/Users/shounokazuaki/cf/lib/publicProfileMetadata.ts)
- [`lib/supporterResultReportSummary.ts`](/Users/shounokazuaki/cf/lib/supporterResultReportSummary.ts)

ポイント:

- DB 一時障害で 500 にするより、少し古い public 情報を返す
- metadata は generic fallback を持つ
- supporter report は stale または `null` を返せるようにする

### 3. 重い下段セクションは deferred に逃がす

対象:

- [`components/profile/PublicProfilePageBodyServer.tsx`](/Users/shounokazuaki/cf/components/profile/PublicProfilePageBodyServer.tsx)
- [`components/profile/PublicProfileDeferredSectionsServer.tsx`](/Users/shounokazuaki/cf/components/profile/PublicProfileDeferredSectionsServer.tsx)
- [`lib/publicProfileDeferredSections.ts`](/Users/shounokazuaki/cf/lib/publicProfileDeferredSections.ts)

ポイント:

- hero / 投稿 / credibility を先に返す
- 支援者ウォール / 実績詳細 / supporter report は `Suspense` 配下に移す
- deferred 側で `loadPublicPageData()` を重ねて呼ばない

### 4. mount 後 fetch の初回ウォーターフォールを潰す

対象:

- [`components/shared/usePublicViewerIdentity.ts`](/Users/shounokazuaki/cf/components/shared/usePublicViewerIdentity.ts)
- [`components/profile/CreatorCommunityCard.tsx`](/Users/shounokazuaki/cf/components/profile/CreatorCommunityCard.tsx)
- [`components/feed/CreatorFeedSection.tsx`](/Users/shounokazuaki/cf/components/feed/CreatorFeedSection.tsx)

ポイント:

- viewer identity は idle 時へ後ろ倒し
- follower summary も idle 時へ後ろ倒し
- SSR 済み `initialFeed` があれば mount 直後の feed 再取得を避ける

### 5. build と runtime の Prisma 方針を分ける

対象:

- [`lib/prisma.ts`](/Users/shounokazuaki/cf/lib/prisma.ts)

ポイント:

- runtime は tail latency を抑えるため `connection_limit` を低め、`pool_timeout` を短めに保つ
- build は static generation が同時に走るので、runtime と同じ値にしない
- build で pool が詰まると prerender error で全体が落ちる

### 6. public layout に DB read を置かない

対象:

- [`app/[username]/layout.tsx`](/Users/shounokazuaki/cf/app/[username]/layout.tsx)
- [`app/creators/layout.tsx`](/Users/shounokazuaki/cf/app/creators/layout.tsx)
- [`components/layout/AppHeader.tsx`](/Users/shounokazuaki/cf/components/layout/AppHeader.tsx)

ポイント:

- layout に `creatorProfile` 読みを置くと、page の read model を軽くしても効きが鈍る
- header menu や bottom nav の client JS は dynamic import で遅延読み込みにする
- public shell は username だけで成立する設計に寄せる

### 7. 上段は server intro、対話は client continuation に分ける

対象:

- [`components/profile/PublicProfileIntroServer.tsx`](/Users/shounokazuaki/cf/components/profile/PublicProfileIntroServer.tsx)
- [`components/ProfileClient.tsx`](/Users/shounokazuaki/cf/components/ProfileClient.tsx)
- [`components/profile/PublicProfilePageBodyServer.tsx`](/Users/shounokazuaki/cf/components/profile/PublicProfilePageBodyServer.tsx)

ポイント:

- hero / support summary / youtube のような静的 UI は server で先に返す
- follow / guide / support sheet / sticky CTA / feed 操作は client 側に残す
- `ProfileClient` に「public では使わない default-only JSX」を残さない

### 8. feed は preview を保ったまま別チャンクへ逃がす

対象:

- [`components/feed/FeedPreviewSection.tsx`](/Users/shounokazuaki/cf/components/feed/FeedPreviewSection.tsx)
- [`components/feed/DeferredFeedSection.tsx`](/Users/shounokazuaki/cf/components/feed/DeferredFeedSection.tsx)
- [`components/feed/LazyFeedSection.tsx`](/Users/shounokazuaki/cf/components/feed/LazyFeedSection.tsx)

ポイント:

- 初期 HTML では feed preview を見せたままにする
- 本体 feed は idle 後に import する
- `route size` と `First Load JS` の両方を下げやすい

### 9. DB に近い region を明示する

対象:

- [`app/[username]/page.tsx`](/Users/shounokazuaki/cf/app/[username]/page.tsx)
- [`app/[username]/layout.tsx`](/Users/shounokazuaki/cf/app/[username]/layout.tsx)
- [`app/creators/layout.tsx`](/Users/shounokazuaki/cf/app/creators/layout.tsx)

`preferredRegion = "syd1"` を設定し、DB が `ap-southeast-2` に近い region へ寄せる。dynamic route の往復が長いときにまず疑う。

## 速度改善でやってはいけないこと

- public page の layout で毎回 DB を読む
- すでに取った集計を別 helper で取り直す
- build と runtime で同じ Prisma pool 設定を使う
- SSR 済みの feed を mount 後にすぐ再取得する
- dev compile を production runtime と混同する

## 変更後の最低確認

```bash
npm run lint
npm run typecheck
npm run build
```

必要に応じて:

```bash
MEASURE_BASE_URL=http://127.0.0.1:3000 \
MEASURE_PATHS=/creators,/taeko \
MEASURE_WARM_RUNS=3 \
npm run measure:public-pages
```

## 次に狙う改善

- public profile hero をさらに server-first にして、`ProfileClient` 依存を減らす
- `/creators` 一覧の read model を作り、カード用集計を別 read で取り直さない
- public snapshot を build artifact または更新イベント連動で保持し、dynamic SSR 依存をさらに下げる
- App Header / Bottom Nav で owner 判定が必要な箇所は、public shell を重くしない client 側方式へ寄せる
