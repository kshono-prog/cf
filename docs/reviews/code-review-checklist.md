# Code Review Checklist

## 共通

- 仕様の範囲を超えていないか
- 既存責務をさらに肥大化させていないか
- docs 更新が必要なのに抜けていないか
- lint / type / build の観点があるか

## API

- 入力検証があるか
- エラー時のレスポンスが一貫しているか
- 高リスク処理に承認境界があるか

## UI

- 状態が増えすぎていないか
- 既存画面に責務を詰め込みすぎていないか
- 正常系だけでなく空状態 / エラー状態があるか

## DB / Prisma

- migration が本当に必要か
- nullable / default の扱いが妥当か
- 既存データの互換性があるか

## AI Task

- task type ごとの input / output が明確か
- audit log が残るか
- 承認前提の設計が維持されているか

