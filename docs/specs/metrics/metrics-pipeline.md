# Metrics Pipeline

## 目的

クリエイターの活動状況を可視化し、AI task の入力として使える状態にする。

## 対象

- `SocialConnection`
- `ContentMetricSnapshot`
- trend 集計 API
- AI analyze task

## 流れ

1. social connection を作る
2. metrics を収集する
3. snapshot として保存する
4. trend を計算する
5. AI analyze / propose の入力に使う

## v1 の出力

- totals
- recent snapshots
- daily trend
- top platform hint

## 注意点

- 外部 API 依存が強い
- 取得失敗時の再試行方針が必要
- `metrics がない` 状態も正常ケースとして扱う

