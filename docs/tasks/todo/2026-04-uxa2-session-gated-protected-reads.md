# UXA-2: protected read を session gate 前提に統一

**Surface**: mypage / manager-desk
**Status**: 完了（2026-04-03）
**依存**: UXA-1

---

## Goal

private read を「署名を毎回要求する API」ではなく、
「検証済み session があるときだけ読める API」に寄せる。

---

## Scope

- `ownerAuthFetch(GET)` を session-only に寄せる
- mypage / manager-desk で未認証時は protected fetch を止める
- generic error ではなく auth-required state を表示する
- session 失効時だけ再認証を促す

---

## Non-Goals

- public surface の認証導線（→ UXP-1）
- protected write の inline feedback 統一
- API のドメイン仕様変更

---

## Files Likely Affected

```
lib/ownerAuthClient.ts
app/api/owner-auth/session/route.ts
lib/ownerAuthApi.ts
app/[username]/mypage/AccountPageClient.tsx
components/mypage/useMyPageMeStatus.ts
components/managerDesk/useManagerDeskAccessState.ts
components/managerDesk/*.tsx
```

---

## Acceptance Criteria

- [x] mypage で毎リロード / 毎ページ遷移の署名が止まる
- [x] manager-desk で未認証時の protected read が generic error にならない
- [x] session 有効中は再署名されない
- [x] session 失効時だけ再認証導線が出る

---

## Risks

- 401 を generic error 扱いしている画面が残ると UX が不統一になる
- GET を auto-auth 前提で書かれた古い hook が残ると意図が崩れる

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- mypage 初回表示
- manager-desk 未認証時の表示
- 認証済み session 中の通常ナビゲーション
