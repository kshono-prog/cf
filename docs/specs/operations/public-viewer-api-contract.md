# Public Viewer API Contract

最終更新: 2026-03-28

## 目的

[`/Users/shounokazuaki/cf/app/api/public/viewer/route.ts`](/Users/shounokazuaki/cf/app/api/public/viewer/route.ts)
が返す viewer identity 補助 payload の contract を固定する。

この endpoint は public profile 上の same-origin UI 分岐を支える補助 route であり、
public documentation 用の API ではない。

## Endpoint

- Method: `GET`
- Path: `/api/public/viewer`
- Query: `address={walletAddress}`

例:

```txt
/api/public/viewer?address=0xabc...
```

## 基本ルール

- same-origin helper として扱う
- external AI / crawler / cross-origin consumer に公開前提で使わない
- public creator summary の代わりに使わない
- owner 判定や viewer-specific branching の補助に限定する

この扱いは
[`/Users/shounokazuaki/cf/docs/architecture.md`](/Users/shounokazuaki/cf/docs/architecture.md)
の `public viewer identity same-origin only` 方針に従う。

## Success Response

成功時は `200`。

address が空のときも `200` で空 payload を返す。
repo 内の対応 fixture は
[`/Users/shounokazuaki/cf/lib/publicApiExamples.ts`](/Users/shounokazuaki/cf/lib/publicApiExamples.ts)
の `PUBLIC_VIEWER_EMPTY_EXAMPLE` と `PUBLIC_VIEWER_CONNECTED_EXAMPLE`。

```json
{
  "ok": true,
  "hasUser": false,
  "hasCreator": false,
  "user": null,
  "creator": null,
  "projectId": null,
  "projectIdsByCurrency": {
    "JPYC": null,
    "USDC": null
  }
}
```

viewer が見つかった場合:

```json
{
  "ok": true,
  "hasUser": true,
  "hasCreator": true,
  "user": {
    "username": "kazu",
    "displayName": "Kazu",
    "profile": "profile"
  },
  "creator": {
    "username": "kazu",
    "displayName": "Kazu",
    "profile": "creator profile",
    "avatarUrl": "/avatars/kazu.jpg",
    "qrcode": null,
    "url": "https://example.com",
    "themeColor": "#005bbb",
    "creatorType": "MUSICIAN"
  },
  "projectId": "project-1",
  "projectIdsByCurrency": {
    "JPYC": "project-1",
    "USDC": null
  }
}
```

## Field 意味

- `ok`
  - 成功時は常に `true`
- `hasUser`
  - address に紐づく user が存在するか
- `hasCreator`
  - address に紐づく creator が存在するか
- `user`
  - 最小の user summary
- `creator`
  - creator が存在する場合の profile DTO
- `projectId`
  - viewer 自身の active project
- `projectIdsByCurrency`
  - `JPYC` / `USDC` ごとの active project ID

## Error Response

lookup 失敗時は `500`。

```json
{
  "ok": false,
  "error": "PUBLIC_VIEWER_GET_FAILED"
}
```

## 主な用途

- public page 上で owner UI を出し分ける
- connected viewer が creator かどうかを軽量判定する
- bottom nav や profile surface の same-origin branching を助ける

## 使わない用途

- search engine / external AI の profile 理解
- public creator discovery の代替
- wallet や支援操作の自動化

## 実装ソース

- route:
  [`/Users/shounokazuaki/cf/app/api/public/viewer/route.ts`](/Users/shounokazuaki/cf/app/api/public/viewer/route.ts)
- read helper:
  [`/Users/shounokazuaki/cf/lib/publicViewerApi.ts`](/Users/shounokazuaki/cf/lib/publicViewerApi.ts)
- payload normalization:
  [`/Users/shounokazuaki/cf/lib/mypageApiResponses.ts`](/Users/shounokazuaki/cf/lib/mypageApiResponses.ts)
- tests:
  [`/Users/shounokazuaki/cf/tests/publicViewerRoute.test.ts`](/Users/shounokazuaki/cf/tests/publicViewerRoute.test.ts)
