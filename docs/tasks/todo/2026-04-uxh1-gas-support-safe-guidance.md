# UXH-1: GasSupport の safe guidance / state feedback 整理

**Surface**: mypage advanced
**Status**: 完了（2026-04-04）
**依存**: UXC-1

---

## Goal

`GasSupportTabs / GasSupportCard` で、
「判定」「署名が必要な操作」「送信済み」「対象外」「要確認」の見え方を整理し、
初回送金前の補助操作として迷いにくくする。

高リスク surface なので、**claim 挙動や署名フローそのものは変えない**。

---

## Scope

- `eligible check` と `claim action` の状態表示を分ける
- raw `alert-warn` と生文字列 error を共通 notice パターンへ寄せる
- 「署名が必要なのは claim ボタン押下時のみ」であることを文言で明示する
- chain tab 切り替え時の helper / pending 表示を見直す
- claim 成功後の `txHash` / review copy を読みやすくする
- `対象外` の理由と `再判定` 導線を card 内で分かりやすくする

### 想定する state

- 未接続
- 判定中
- 判定失敗
- 対象外
- 対象
- claim 実行中
- claim 成功（txHash あり）
- claim 失敗

---

## Non-Goals

- eligibility rule の変更
- nonce / signature / claim API の変更
- faucet amount や配布条件の変更
- auto-claim / auto-sign の追加
- chain / wallet / fund movement behavior の変更

---

## Files Likely Affected

```
components/mypage/GasSupportTabs.tsx
components/mypage/GasSupportCard.tsx
lib/mypage/workspaceActionCopy.ts
components/mypage/WorkspaceFeedback.tsx
```

---

## Acceptance Criteria

- `判定中 / 対象外 / 対象 / claim 中 / claim 後` の見え方が今より明確
- generic な warning box ではなく、意味のある notice と helper copy で状態が伝わる
- 署名が必要なのは `claim` 実行時だけだと UI 上で分かる
- chain 切り替え時に「失敗」なのか「未判定」なのかが混ざらない
- 成功時は txHash と次の確認ポイントが自然に読める

---

## Risks

- GasSupport は実質的に fund movement に近い補助面なので、文言変更でも誤認を生む可能性がある
- `対象外` の説明を変えすぎると、実際の eligibility rule とズレる危険がある
- success copy を強くしすぎると、onchain finality や反映タイミングを誤解させる可能性がある

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- 未接続時に card が誤表示されない
- eligible 判定中と判定失敗が混ざらない
- 対象外理由が読みやすい
- claim ボタン押下時にのみ署名が要求される
- 署名拒否 / claim 失敗 / claim 成功の表示が区別できる
- txHash 表示後に再判定しても UX が壊れない

---

## Result

- `GasSupportTabs.tsx` で eligibility error と claim error の文脈を分離した
- `GasSupportCard.tsx` を raw warning box から `WorkspaceStatusNotice` ベースへ寄せた
- 署名が必要なのは claim 実行時だけであることを card 内 copy で明示した
- txHash / 対象外理由 / claim failure の見え方を card 単位で整理した
