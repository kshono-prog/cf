# Migration Runbook

## 原則

- schema 変更は常に要承認
- migration は単機能で小さく保つ
- 変更理由を decision または task に残す

## 変更前に確認すること

1. 既存データに影響するか
2. nullable か required か
3. deploy 順序に依存するか
4. ロールバックが難しいか

## migration に含めるべき内容

- 目的
- 影響範囲
- 既存データへの注意
- 検証手順

