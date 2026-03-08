# Metrics Pipeline

## 目的

クリエイターの活動状況を可視化し、AI task の入力として使える状態にする。

## 対象

- `SocialConnection`
- `ContentMetricSnapshot`
- trend 集計 API
- AI analyze task
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`

## 流れ

1. social connection を作る
2. metrics を収集する
3. snapshot として保存する
4. trend を計算する
5. AI analyze / propose / report / draft の入力に使う

## v1 の出力

- totals
- recent snapshots
- daily trend
- top platform hint

## AI Task への接続

現在 metrics を参照する task:

- `ANALYZE`
  活動サマリ、主要 insight、次アクションに使う
- `PROPOSE`
  企画案の補助根拠に使う
- `WEEKLY_REPORT`
  週次 summary、highlights、action items に使う
- `ANNOUNCEMENT_DRAFT`
  告知本文に入れる実績や根拠として任意利用する
- `SUPPORTER_MESSAGE_DRAFT`
  支援者向け文面の補助情報として任意利用する

依存の強さ:

- `ANALYZE` と `WEEKLY_REPORT` は metrics が主材料
- `ANNOUNCEMENT_DRAFT` と `SUPPORTER_MESSAGE_DRAFT` は metrics なしでも成立させる

## 正常系の定義

- metrics snapshot が 0 件でも task 作成は成功してよい
- その場合、文面は `不足している / まだ少ない` 前提で返す
- UI は空データを失敗扱いにしない

## 注意点

- 外部 API 依存が強い
- 取得失敗時の再試行方針が必要
- `metrics がない` 状態も正常ケースとして扱う
