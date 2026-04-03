# UXH-2: ProjectSettlement の operator UX guardrails 整理

**Surface**: mypage advanced
**Status**: 完了（2026-04-04）
**依存**: UXC-1

---

## Goal

`ProjectSettlement*` の guided flow で、
「いまどの step か」「次の手動操作は何か」「どこからが高リスク操作か」を
より明確にし、operator 向けの確認負荷を下げる。

高リスク surface なので、**bridge / distribution / execute / manual result の挙動は変えない**。

---

## Scope

- `Bridge / Draft / Preflight / Execute / Review` の step-local notice を再点検する
- raw operator message や曖昧な補助文を copy helper へ寄せる
- `Bridge now / Save draft / Run preflight / Distribute` 前の manual boundary copy を明確にする
- `advanced controls` を「必要時のみ開く operator 向け操作」としてさらに明示する
- `Review` step で `execution logs / manual result / CCTP` の責務をより読み分けやすくする
- error / success / pending の見え方を step ごとに揃える

### 想定する見直し対象

- top-level status notice
- step header helper copy
- preflight failure / readiness copy
- execution 前後の caution / next-step copy
- review step の結果確認コピー

---

## Non-Goals

- settlement API / bridge API / distribution API の変更
- transaction sequence や chain 切り替え挙動の変更
- execution の自動化
- distribution algorithm や draft payload の変更
- CCTP / manual result のロジック変更
- fund movement behavior の変更

---

## Files Likely Affected

```
components/mypage/ProjectSettlementPanel.tsx
components/mypage/ProjectSettlementGuidedFlow.tsx
components/mypage/ProjectSettlementBridgeSection.tsx
components/mypage/ProjectSettlementDistributionDraftSection.tsx
components/mypage/ProjectSettlementPreflightSection.tsx
components/mypage/ProjectSettlementDistributionExecutionSection.tsx
components/mypage/ProjectSettlementExecutionLogsSection.tsx
components/mypage/ProjectSettlementAdvancedSection.tsx
components/mypage/ProjectSettlementCctpSection.tsx
components/mypage/ProjectSettlementManualResultSection.tsx
components/mypage/useProjectSettlementDataFetch.ts
components/mypage/useProjectSettlementBridgeState.ts
components/mypage/useProjectSettlementDistributionState.ts
components/mypage/useProjectSettlementExecutionState.ts
lib/uxCopy.ts
```

---

## Acceptance Criteria

- first view で「現在 step」と「次にやる manual action」が今より分かりやすい
- high-risk button の直前に、何を確認すべきかが copy で伝わる
- step ごとの失敗表示が generic message ではなく意味のある notice になる
- `advanced controls` が main flow を圧迫せず、それでも必要時には辿れる
- `Review` step で「実行結果の確認」と「例外的な手動記録」が混ざりすぎない

---

## Risks

- settlement は bridge / distribution / execution と直結しているため、copy 変更でも誤認が起こりうる
- `成功` の言い方を強めすぎると、ウォレット承認・chain finality・保存完了の境界が曖昧になる
- advanced controls の扱いを誤ると、運用上必要な手動 escape hatch が見えにくくなる

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- current step と top-level notice の整合
- Bridge step の ready / not-ready / failure 表示
- Draft 保存前後の notice
- Preflight 成功 / failure の見え方
- Execute 前の caution と Execute 後の review 導線
- Review step の execution logs / manual result / advanced controls の見え方
- 既存の bridge / distribution / manual result 挙動が変わっていないこと

---

## Result

- `ProjectSettlementPanel.tsx` で step helper と current-step notice を operator 向けの guardrail copy に更新した
- `ProjectSettlementBridgeSection.tsx` で Bridge now の進行表示を notice 化し、実行前の注意文を追加した
- `ProjectSettlementDistributionDraftSection.tsx` と `ProjectSettlementDistributionExecutionSection.tsx` で「ここではまだ送金されない / ここから先は実送金」の境界を明示した
- `ProjectSettlementAdvancedSection.tsx` を「必要時のみ」扱いへ寄せ、advanced controls の責務を明示した
- `lib/uxCopy.ts` と settlement state hooks で success / pending / partial completion copy を整理した
