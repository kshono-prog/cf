# UXH-3: ProjectSettlement の review / manual result / CCTP guidance 整理

**Surface**: mypage advanced
**Status**: 完了（2026-04-04）
**依存**: UXH-2

---

## Goal

`ProjectSettlement*` の Review 周辺で、
「通常どこまで見れば十分か」「どこからが例外的な手動補完か」「CCTP 管理はどんなときに触るのか」を
より読み分けやすくする。

高リスク surface なので、**manual result / CCTP / execution log のロジックは変えない**。

---

## Scope

- `実行ログ` に通常確認用の guidance を追加する
- `送信結果の手動記録` に manual boundary copy を追加する
- `CCTP` に operator-only guidance と失敗時の読みやすい表示を足す
- `Review` で見るべき順番を notice で補助する

### 想定する見直し対象

- `ProjectSettlementExecutionLogsSection.tsx`
- `ProjectSettlementManualResultSection.tsx`
- `ProjectSettlementCctpSection.tsx`
- `ProjectSettlementPanel.tsx`

---

## Non-Goals

- execution log の記録ロジック変更
- manual result の保存仕様変更
- CCTP action / retry / complete の挙動変更
- bridge / distribution / fund movement behavior の変更

---

## Acceptance Criteria

- Review step で「通常は実行ログを見る」が今より明確
- Manual Result が「確認済み結果を補完する場」であると分かる
- CCTP が通常フローではなく operator 向け管理であると分かる
- 失敗理由が raw text だけより読みやすい
- high-risk action の前に、何を確認してから押すかが copy で伝わる

---

## Risks

- copy の強さ次第で「完了」と「確認済み記録」の境界が曖昧になりうる
- CCTP は chain をまたぐ運用面に近いため、通常フローと誤認させない配慮が必要

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- Review step で実行ログの確認導線が先に見えること
- Manual Result が通常導線ではなく補完操作として見えること
- CCTP 失敗理由と next action が以前より読みやすいこと
- 既存の manual result / CCTP action 挙動が変わっていないこと

---

## Result

- `ProjectSettlementExecutionLogsSection.tsx` に review 用の先頭 notice と execution result 別の補助 copy を追加した
- `ProjectSettlementManualResultSection.tsx` に manual boundary copy を追加し、外部確認済みの結果だけを記録する前提を明示した
- `ProjectSettlementCctpSection.tsx` に operator-only guidance と status ごとの next-step notice を追加した
- `ProjectSettlementPanel.tsx` で review / CCTP advanced の説明文を今回の guidance に合わせて更新した
