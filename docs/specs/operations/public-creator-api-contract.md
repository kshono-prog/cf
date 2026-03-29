# Public Creator API Contract

最終更新: 2026-03-28

## 目的

[`/Users/shounokazuaki/cf/app/api/public/creator/route.ts`](/Users/shounokazuaki/cf/app/api/public/creator/route.ts) が返す
公開 creator 要約の contract を固定する。

public API 全体の位置づけは
[Public API Index](/Users/shounokazuaki/cf/docs/specs/operations/public-api-index.md)
を参照。

この endpoint は次の用途を想定する。

- 公開プロフィールを開く前に、AI agent が軽量な公開要約を取得する
- 検索 / discovery 面から特定 creator の公開情報を補助的に読む
- public surface の read-only summary を、内部 workflow と分けて扱う

## Endpoint

- Method: `GET`
- Path: `/api/public/creator`
- Query: `username={username}`

例:

```txt
/api/public/creator?username=kazu
```

## 基本ルール

- read-only endpoint として扱う
- internal workflow の代替として使わない
- `mypage`、`manager-desk`、通知、compose の代わりに使わない
- wallet 接続、応援送信、bridge、settlement、distribution の自動実行には使わない

## Success Response

成功時は `200` で次を返す。
repo 内の対応 fixture は
[`/Users/shounokazuaki/cf/lib/publicApiExamples.ts`](/Users/shounokazuaki/cf/lib/publicApiExamples.ts)
の `PUBLIC_CREATOR_API_EXAMPLE`。

```json
{
  "ok": true,
  "creator": {
    "username": "kazu",
    "displayName": "Kazu",
    "avatarUrl": null,
    "profile": "…",
    "qrcode": null,
    "url": null,
    "themeColor": null,
    "creatorType": "MUSICIAN",
    "ecosystemRole": "CREATOR",
    "socials": {
      "twitter": "https://x.com/example"
    },
    "youtubeVideos": [],
    "projectId": "10",
    "projectIdsByCurrency": {
      "JPYC": "10",
      "USDC": "20"
    },
    "latestProjectSummary": {
      "projectId": "10",
      "title": "Pinned project",
      "currency": "JPYC",
      "targetAmount": 1000,
      "confirmedAmount": 250,
      "progressPct": 25,
      "achievedAt": null
    }
  },
  "projectId": "10",
  "projectIdsByCurrency": {
    "JPYC": "10",
    "USDC": "20"
  },
  "latestProjectSummary": {
    "projectId": "10",
    "title": "Pinned project",
    "currency": "JPYC",
    "targetAmount": 1000,
    "confirmedAmount": 250,
    "progressPct": 25,
    "achievedAt": null
  },
  "summary": null,
  "summariesByCurrency": {
    "JPYC": null,
    "USDC": null
  }
}
```

## Top-level Fields

- `ok`
  - 成功時は常に `true`
- `creator`
  - 公開 creator profile の基本 DTO
- `projectId`
  - 現在 public surface で優先表示される project ID
- `projectIdsByCurrency`
  - `JPYC` / `USDC` ごとの active project ID
- `latestProjectSummary`
  - 現在の public project を軽量に要約した field
- `summary`
  - `projectId` に対応する詳細 summary
- `summariesByCurrency`
  - `JPYC` / `USDC` ごとの summary

## creator Field

`creator` は [`CreatorPublicDto`](/Users/shounokazuaki/cf/lib/serializers/creator.ts) を返す。

主な field:

- `username`
- `displayName`
- `avatarUrl`
- `profile`
- `qrcode`
- `url`
- `themeColor`
- `creatorType`
- `ecosystemRole`
- `socials`
- `youtubeVideos`
- `projectId`
- `projectIdsByCurrency`
- `latestProjectSummary`

用途:

- 公開プロフィールの hero 情報を先に読む
- social / type / role を軽量に把握する
- AI agent が公開 creator の文脈を得る

## latestProjectSummary Field

`latestProjectSummary` は current public project の最小要約。

field:

- `projectId`
- `title`
- `currency`
  - `JPYC` または `USDC`
- `targetAmount`
- `confirmedAmount`
- `progressPct`
- `achievedAt`

用途:

- 一覧や preview で支援状況を軽量表示する
- full `summary` を読む前に progress を把握する

## summary / summariesByCurrency

`summary` と `summariesByCurrency.*` は
[`SummaryViewData`](/Users/shounokazuaki/cf/lib/mypage/accountPageTypes.ts) ベースの payload を返す。

主な field:

- `project`
  - `id`, `title`, `description`, `status`, `currency`, `creatorProfileId`
- `goal`
  - `targetAmount`, `achievedAt`, `deadline`
- `progress`
  - `confirmedAmount`, `targetAmount`, `progressPct`, `totals`
- `distributionPlan`
- `lastBridgeRuns`
- `lastDistributionRuns`

注意:

- public endpoint では read-only summary として扱う
- `distributionPlan` や execution log が含まれても、実行導線として使わない
- AI agent は `project / goal / progress` を主に参照し、それ以外は補助情報として扱う

## Error Response

### Missing username

`400`

```json
{
  "ok": false,
  "error": "USERNAME_REQUIRED"
}
```

### Creator not found

`404`

```json
{
  "ok": false,
  "error": "CREATOR_NOT_FOUND"
}
```

### Fetch failure

`500`

```json
{
  "ok": false,
  "error": "PUBLIC_CREATOR_FETCH_FAILED",
  "detail": "..."
}
```

## AI Agent Guidance

推奨の読み順:

1. `/creators` または filter 付き `/creators?...` で候補を絞る
2. `/api/public/creator?username={username}` で軽量要約を読む
3. 必要なら `/{username}` の公開プロフィールを開いて本文を確認する

避けること:

- internal workflow の代替としてこの endpoint を使う
- wallet 接続や応援送信を自動化する
- internal-only page を public documentation とみなす

## 実装ソース

- route:
  [`/Users/shounokazuaki/cf/app/api/public/creator/route.ts`](/Users/shounokazuaki/cf/app/api/public/creator/route.ts)
- data assembly:
  [`/Users/shounokazuaki/cf/lib/publicCreatorApi.ts`](/Users/shounokazuaki/cf/lib/publicCreatorApi.ts)
- project summary resolution:
  [`/Users/shounokazuaki/cf/lib/publicCreatorProjects.ts`](/Users/shounokazuaki/cf/lib/publicCreatorProjects.ts)
- serializer:
  [`/Users/shounokazuaki/cf/lib/serializers/creator.ts`](/Users/shounokazuaki/cf/lib/serializers/creator.ts)
