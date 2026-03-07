# Incident Response Runbook

## 対象

- 本番での API 異常
- bridge / settlement 異常
- metrics 収集失敗
- AI task 異常終了

## 初動

1. 何が壊れているかを切り分ける
2. 高リスク処理を止める
3. ログと再現条件を記録する
4. 影響範囲を明文化する

## 記録すること

- 発生時刻
- 影響画面 / API
- 再現条件
- 暫定対処
- 恒久対策

## 高リスク判定

以下は即時に慎重対応:

- 金銭移動
- distribution 実行
- bridge 記録不整合
- profile 破損

