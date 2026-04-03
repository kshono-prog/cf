# UXM-4: Manager Desk Creator Detail の meeting feedback 整理

## 背景

`manager-desk/creators/[creatorProfileId]` の detail 面では、`Meeting copilot` と `completed meeting` の follow-up 導線に raw text ベースの保存結果表示が残っている。

- `保存に失敗しました`
- `Noteを作成しました`
- `作成中...`

これらは `UXM-3` までで揃えた notice 基盤と分離しており、detail 面の mutation feedback が一貫しない。

## 目的

- `MeetingCopilotCard` の保存 / 完了 / 失敗を notice ベースに揃える
- `CompletedMeetingCard` の follow-up note 作成結果を notice ベースに揃える
- `meeting 完了後の follow-up 作成` も同じ tone で見せる

## 非目的

- meeting 保存 API の変更
- follow-up note 作成仕様の変更
- 権限や owner session の挙動変更

## 対応方針

1. `ManagerDeskMutationNotice` を meeting 系 feedback にも使う
2. raw text の success / error / loading を notice に置き換える
3. `完了にして保存` が無効な理由も inline text ではなく info notice に寄せる

## 完了条件

- `Meeting copilot` の保存・完了・失敗が notice で表示される
- `Completed meeting` の follow-up note 作成結果が notice で表示される
- 既存 API と state machine は変えない

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## 完了メモ

- `MeetingCopilotCard` の保存 / 完了 / 失敗を `ManagerDeskMutationNotice` に統一
- `CompletedMeetingCard` と `meeting 完了後 follow-up` の note 作成結果も notice に統一
- meeting API や follow-up 作成仕様は未変更
