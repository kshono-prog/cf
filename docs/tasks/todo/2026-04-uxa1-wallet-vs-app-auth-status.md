# UXA-1: wallet connected / app authenticated の状態分離

**Surface**: 共通
**Status**: 完了（2026-04-03）
**依存**: なし

---

## Goal

「ウォレット接続」と「アプリ認証」を別の状態として扱い、
画面と API の両方で意味が混ざらないようにする。

---

## Scope

- wagmi 再接続と初期 hydration の見直し
- app auth session を独立 state として管理
- header / mypage で `接続済み / 認証済み / 認証が必要` を分離表示
- disconnect 時に wallet state と app auth state を別々に適切にクリア

---

## Non-Goals

- protected read の auth gate 整理（→ UXA-2）
- public surface の認証導線（→ UXP-1）
- form save UX の統一（→ UXC-1）

---

## Files Likely Affected

```
context/AppKitProvider.tsx
context/OwnerSessionProvider.tsx
components/layout/HeaderWalletMenu.tsx
app/[username]/layout.tsx
app/creators/layout.tsx
lib/ownerAuthClient.ts
```

---

## Acceptance Criteria

- [x] リロード後に前回の connector / account が可能な限り復元される
- [x] wallet connected と app authenticated が別状態として扱われる
- [x] header や主要画面で「認証が必要」が明示される
- [x] 通常のページ遷移だけで signMessage が走らない

---

## Risks

- SSR で request-aware な layout が増える
- 既存の「接続済み = 認証済み」前提コードが残ると表示崩れが起きる

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- 初回表示時の接続チラつき
- 接続済み・未認証状態の header 表示
- disconnect 後の session clear
