# Public Surface Measurement Runbook

## 目的

public の重要導線である `profile / home / search / events` を、同じ条件で cold / warm 計測できるようにする。

## 対象ページ

- `/{username}`
- `/{username}/home`
- `/{username}/search`
- `/{username}/events`

既定値は `kazu` を想定しているが、`MEASURE_PATHS` で差し替え可能。

## 推奨手順

1. production build を作る
2. `next start` でローカル起動する
3. 計測スクリプトを実行する
4. 結果を issue / PR に残す

## コマンド

```bash
npm run build
npm run start
MEASURE_BASE_URL=http://127.0.0.1:3000 npm run measure:public-pages
```

## オプション

```bash
MEASURE_BASE_URL=http://127.0.0.1:3000 \
MEASURE_PATHS=/kazu,/kazu/home,/kazu/search,/kazu/events \
MEASURE_WARM_RUNS=3 \
npm run measure:public-pages
```

## 読み方

- `cold`: そのページの最初の 1 回
- `warm_avg`: 2 回目以降の平均
- `warm_min / warm_max`: warm の振れ幅
- `bytes`: 返却 HTML の概算サイズ

## 注意

- dev server の初回 compile は計測に混ぜない
- 計測前に別タブのアクセスを止める
- compare は before / after で同じ `baseUrl` と `paths` を使う
- 大きく遅い場合は、DB query 数と client mount 後 fetch を両方確認する
