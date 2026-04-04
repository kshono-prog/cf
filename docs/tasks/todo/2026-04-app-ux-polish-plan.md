# App UX 改修計画

**作成日**: 2026-04-03
**目的**: 本アプリ全体で「迷わない / 署名が暴れない / 状態がわかる」UX に寄せる

---

## 北極星

> 「接続・認証・操作可能状態が一目でわかり、必要な操作のときだけ迷わず進める」

ウォレット接続とアプリ認証を分離しつつ、
Creator Surface / Public Surface / Manager Surface の状態表示と導線を揃える。

---

## Issue 一覧

| ID | タイトル | Surface | Status | 依存 |
|---|---|---|---|---|
| [UXA-1](2026-04-uxa1-wallet-vs-app-auth-status.md) | wallet connected / app authenticated の状態分離 | 共通 | ✅ 完了（2026-04-03） | なし |
| [UXA-2](2026-04-uxa2-session-gated-protected-reads.md) | protected read を session gate 前提に統一 | mypage / manager-desk | ✅ 完了（2026-04-03） | UXA-1 |
| [UXP-1](2026-04-uxp1-public-surface-auth-guidance.md) | Public Surface の認証導線と文言を揃える | public profile / notifications / feed | ✅ 完了（2026-04-03） | UXA-1, UXA-2 |
| [UXC-1](2026-04-uxc1-creator-home-save-feedback-normalization.md) | Creator Home の保存・pending・完了フィードバック統一 | mypage | ✅ Phase 11 完了（2026-04-04） | UXA-1 |
| [UXM-1](2026-04-uxm1-manager-desk-partial-loading-normalization.md) | Manager Desk の部分 loading / filter feedback 整理 | manager-desk | ✅ 完了（2026-04-04） | UXA-2 |
| [UXM-2](2026-04-uxm2-manager-desk-detail-section-feedback.md) | Manager Desk Creator Detail の section loading / stale feedback 整理 | manager-desk detail | ✅ 完了（2026-04-04） | UXM-1 |
| [UXM-3](2026-04-uxm3-manager-desk-detail-mutation-feedback.md) | Manager Desk Creator Detail の mutation feedback 整理 | manager-desk detail | ✅ 完了（2026-04-04） | UXM-2 |
| [UXM-4](2026-04-uxm4-manager-desk-meeting-feedback-normalization.md) | Manager Desk Creator Detail の meeting feedback 整理 | manager-desk detail | ✅ 完了（2026-04-04） | UXM-3 |
| [UXF-1](2026-04-uxf1-radius-semantics-clickable-vs-static.md) | clickable / static の radius semantic を分ける | 共通 UI foundation | ✅ 完了（2026-04-04） | なし |
| [UXF-2](2026-04-uxf2-static-surfaces-square.md) | non-clickable surface を四角に統一する | 共通 UI foundation | ✅ 完了（2026-04-04） | UXF-1 |
| [UXH-1](2026-04-uxh1-gas-support-safe-guidance.md) | GasSupport の safe guidance / state feedback 整理 | mypage advanced | ✅ 完了（2026-04-04） | UXC-1 |
| [UXH-2](2026-04-uxh2-project-settlement-operator-guardrails.md) | ProjectSettlement の operator UX guardrails 整理 | mypage advanced | ✅ 完了（2026-04-04） | UXC-1 |
| [UXH-3](2026-04-uxh3-project-settlement-review-surface-guidance.md) | ProjectSettlement の review / manual result / CCTP guidance 整理 | mypage advanced | ✅ 完了（2026-04-04） | UXH-2 |

---

## 実行順

### Phase 1: 認証まわりの迷いをなくす

```
UXA-1 → UXA-2 → UXP-1
```

- 接続状態と認証状態を明確に分離する
- protected read は session があるときだけ読みに行く
- public surface でも「認証が必要」を generic error ではなく導線として見せる

### Phase 2: 使っている最中のストレスを減らす

```
UXC-1 + UXM-1 → UXM-2 → UXM-3 → UXM-4
```

- 保存中 / 保存完了 / エラー / auth-required の表示を統一する
- filter 変更や refetch 中に画面全体が壊れて見えないようにする
- detail 面の section でも stale data を残した再読込表示へ揃える
- detail 面の保存系フォームも raw text ではなく notice に寄せる
- detail 面の meeting copilot / follow-up 作成も notice に揃える

### Phase 3: 高リスク operator surface を慎重に整える

```
UXH-1 → UXH-2 → UXH-3
```

- `GasSupport` は claim 前後の guidance と state copy だけを慎重に整理する
- `ProjectSettlement` は guided flow の notice / caution / review copy だけを慎重に整理する
- `UXH-3` では review / manual result / CCTP の責務境界をさらに読み分けやすくする
- どちらも bridge / distribution / fund movement behavior は変えない

---

## 制約

- bridge / distribution / fund movement の挙動は変えない
- ウォレット署名は必要な場面だけに限定する
- Prisma schema は今回の計画では触らない
- `1 Issue = 1 PR` を前提に粒度を維持する
- `UXH-*` は copy / notice / guidance を主対象とし、挙動変更は別承認とする

---

## Validation Baseline

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- リロード直後の接続表示
- 接続済み / 未認証 / 認証済みの見え方
- public profile / notifications / manager-desk の auth-required 導線
- 通常ナビゲーションで不要な署名が出ないこと
