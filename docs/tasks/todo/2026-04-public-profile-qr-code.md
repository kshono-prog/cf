# Public Profile QR Code

**Phase**: MVP
**Status**: ready
**依存**: 既存 `CreatorProfile.qrcodeUrl` / 公開プロフィール read model / owner-auth API / public QR route

---

## Goal

公開プロフィールに、そのプロフィール URL を指す QR コードを
**さりげなく表示**できるようにする。

同時に、QR 画像は毎回生成し直さず、

- 既に再利用可能な画像 URL があればそれを使う
- ない場合のみ server 側で生成して保存する

という流れを成立させる。

---

## Assumption

ここでいう「URL が存在しない場合」は、
**プロフィール URL そのものではなく `CreatorProfile.qrcodeUrl` が未設定**という意味で扱う。

公開プロフィールの遷移先 URL 自体は、現状の `username` から
`withBaseUrl(username)` で常に導出できる前提とする。

---

## Decision

MVP では、次の 3 点を採用する。

### 1. 既存 `CreatorProfile.qrcodeUrl` を canonical に使う

- Prisma schema にすでに `qrcodeUrl` が存在する
- `serializeCreatorProfile()` / `parseCreatorProfile()` / public API contract にもすでに流れている
- そのため schema 追加なしで実装できる

### 2. public request では QR 生成・保存をしない

- 公開プロフィールは初期表示速度と DB 負荷が重要
- public read path で storage upload や DB update を行うと、
  体感速度と可用性を落としやすい
- そのため、**生成責務は owner-auth / server action 相当の write path に寄せる**

### 3. 表示は「canonical route 優先」で壊れないようにする

- `qrcodeUrl` には固定 PNG の storage URL ではなく、
  **canonical な app route path** を持たせる
- 例: `/api/creators/kazu/qrcode`
- route 自体が、その request の host を見て現在の public profile URL を QR 化する
- owner-auth ensure API は、未設定または stale な `qrcodeUrl` をこの canonical route に揃える

この構成により、

- public page は落ちにくい
- 複数 deploy / 複数 base URL でも正しいプロフィール URL を埋め込める
- `qrcodeUrl` は route path として再利用できる
- `qrcodeUrl` が欠けていても UI は成立する

---

## Scope

### 1. QR の canonical target URL を定義する

- target は `withBaseUrl(username)` を使う
- 例: `https://creatorfounding.example/kazu`
- `projectId` や query string は含めない
- 目的は「その creator の公開プロフィールを開く」ことに限定する

### 2. QR 画像の再利用ルールを定義する

- `CreatorProfile.qrcodeUrl` が canonical route path と一致する場合は再利用する
- absolute URL で保存されていても、
  path が `/api/creators/{username}/qrcode` と一致するなら再利用扱いにしてよい
- それ以外の stale 値は canonical route path に更新する

staleness 判定は追加 schema を避けるため、
**canonical route path との一致判定**で行う。

例:

```txt
/api/creators/{username}/qrcode
```

これにより、

- username 変更時
- 複数 base URL での表示時

にも、同じ route path を再利用しながら request ごとの host で QR を描き分けられる。

### 3. QR 生成 service を server-only で追加する

新規 service 例:

```ts
lib/profileQrCode.ts
lib/profileQrCodeServer.ts
```

責務:

- canonical route path を組み立てる
- `qrcodeUrl` が再利用可能か判定する
- request host から canonical target URL を組み立てる
- その URL を PNG QR として描画する
- 必要な場合だけ `CreatorProfile.qrcodeUrl` を更新する

想定 API:

```ts
type EnsureCreatorProfileQrCodeArgs = {
  creatorProfileId: bigint;
  username: string;
  walletAddress: string;
  force?: boolean;
};
```

返り値:

```ts
type EnsureCreatorProfileQrCodeResult = {
  qrcodeUrl: string;
  reused: boolean;
  targetUrl: string;
};
```

### 4. owner-auth の ensure endpoint を追加する

新規 route 例:

```txt
POST /api/creator/qrcode
```

request:

```json
{
  "address": "0x...",
  "force": false
}
```

挙動:

- owner session を確認
- 対象 creator profile を取得
- `qrcodeUrl` を canonical route path に揃える
- `qrcodeUrl` / `reused` / `targetUrl` を返す

ポイント:

- public request からは呼ばない
- save 導線や owner-facing UI からのみ呼ぶ

### 5. public fallback route を追加する

新規 route 例:

```txt
GET /api/creators/[username]/qrcode
```

挙動:

- `username` から creator を読む
- request host から canonical public profile URL を組み立てる
- その場で QR 画像を返す
- DB update はしない

用途:

- canonical QR image source
- `qrcodeUrl` 未生成時の fallback
- owner preview

### 6. 表示位置は「右カラムの小さな share card」を基本にする

MVP の表示位置:

- desktop: public profile 右カラム
- mobile: 同カードを縦積みの中で自然に表示

UI 方針:

- hero 主役にはしない
- `スマホで開く` / `プロフィールURL` 程度の短い補助文に留める
- QR サイズは `88px - 112px` 程度
- 画像の横に短い URL 表示、または `プロフィールを共有` copy を置く

新規 component 例:

```tsx
components/profile/PublicProfileQrCard.tsx
```

### 7. owner-facing でも再利用確認できるようにする

既存の

```txt
components/mypage/CreatorPublicLinkSection.tsx
```

に QR preview を追加する。

挙動:

- `workspace.creator.qrcode` があれば即表示
- なければ mount 後に ensure API を叩いて生成
- `再生成` ボタンを置く場合は `force: true`

この面を generation entry にすることで、
public request を重くせずに「必要なものは自然に生成される」状態を作れる。

### 8. cache invalidation を明示する

今回の route-first 実装では、
public profile は `qrcodeUrl` がなくても canonical route で表示できる。

そのため cache invalidation は
`表示の成立` より `owner-facing metadata 反映` のために扱う。

MVP では:

- owner-facing component は ensure API response を local state に反映
- public profile は route path を常に導出できるため、
  `qrcodeUrl` cache stale でも表示自体は壊れない

---

## Non-Goals

- 新しい Prisma schema 追加
- QR コード経由のアクセス解析や scan tracking
- project / support deep-link を含む QR のバリエーション生成
- AI Manager ページ用 QR の同時対応
- ブランディング付き装飾 QR やロゴ埋め込み
- QR 画像の binary を storage に固定保存すること

---

## Recommended Library / Format

MVP は `qrcode` 系の軽量 server-side library を使い、
PNG を生成する案を推奨する。

理由:

- スキャナ互換性が高い
- route response として扱いやすい
- `next/image` でも普通の画像として扱いやすい

補足:

- SVG でもよいが、storage reuse と扱いの単純さでは PNG が無難
- 見た目は白背景 / 黒コードの標準型で十分

---

## Data / Flow

### A. owner-facing 初回生成

1. owner が `CreatorPublicLinkSection` を開く
2. `creator.qrcode` が canonical route ならそのまま再利用
3. なければ `POST /api/creator/qrcode` を呼ぶ
4. server が `qrcodeUrl` を canonical route path に更新
5. current host での `targetUrl` を返す
6. UI が `qrcodeUrl` を再表示

### B. public profile 表示

1. public page read model が `creator.qrcode` を読む
2. `qrcodeUrl` があれば canonical route として再利用する
3. なければ `GET /api/creators/[username]/qrcode` を画像 src に使う
4. public page は write を発生させない

### C. username 変更時

1. username save 成功
2. 旧 `qrcodeUrl` path は username 不一致で再利用不可
3. 次回 owner-facing load で ensure が走る
4. 必要なら save 成功後に非同期 ensure を呼んでもよい

---

## Files Likely Affected

```ts
lib/profileQrCode.ts                          // 新規: QR target/build/hash/ensure service
lib/profileQrCodeServer.ts                    // 新規: QR render/persistence helper
app/api/creator/qrcode/route.ts               // 新規: owner-auth ensure endpoint
app/api/creators/[username]/qrcode/route.ts   // 新規: public canonical image route
components/profile/PublicProfileQrCard.tsx    // 新規: subtle QR card
components/profile/PublicProfilePageBodyServer.tsx
components/mypage/CreatorPublicLinkSection.tsx
lib/serializers/creator.ts                    // 変更不要想定、必要なら helper 追加のみ
```

---

## Acceptance Criteria

- [ ] 公開プロフィールに QR コードが小さく自然に表示される
- [ ] QR の遷移先は常にその creator の canonical public profile URL である
- [ ] 現在の deploy host に応じて QR の遷移先が変わる
- [ ] `qrcodeUrl` が有効な場合は canonical route path を再利用する
- [ ] `qrcodeUrl` がない場合は owner-facing ensure path から canonical route path を作れる
- [ ] public page request 自体は QR 保存の write を行わない
- [ ] `qrcodeUrl` がなくても fallback route で UI が壊れない
- [ ] QR 保存後、owner 面と public 面の両方で短時間で反映される
- [ ] wallet / billing / internal-only 情報は公開しない

---

## Risks

- public request で生成・保存すると初期表示が遅くなる
  - public read と write path を分離する

- 複数 deploy / 複数 base URL で間違った URL を埋め込んでしまう
  - QR 自体は request host ベースで route render する

- cache が残って「生成したのに表示されない」状態になる
  - public profile は canonical route を常に導出できるようにする

- QR が主張しすぎて public profile の主役を奪う
  - 右カラムの小さな share card に留める

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- `qrcodeUrl` あり / なしで public profile の表示を確認
- owner-facing `CreatorPublicLinkSection` で初回生成を確認
- username 変更後に旧 QR が再利用されないことを確認
- mobile / desktop の両方でカードのサイズ感を確認
- public profile の初期表示が QR 追加で悪化していないことを確認
