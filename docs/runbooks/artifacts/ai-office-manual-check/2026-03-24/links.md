# AI Office Manual Check Links

- 日付: 2026-03-24
- 対象 creator: `kazu`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-24/`
- 事前スモーク:
  - `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3001 --username kazu`

## Minimum Deep Links

- Home / AIアシスタント:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1#ai-office
- Daily-work route:
  - http://127.0.0.1:3001/kazu/mypage/daily-work?manualCheck=1#ai-office
- Settings route:
  - http://127.0.0.1:3001/kazu/mypage/settings?manualCheck=1
- Manager Agent Create:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=MANAGER#ai-office
- Manager Agent Detail:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=MANAGER&aiOfficeInboxRole=MANAGER&aiOfficeOpenLatestTaskType=MANAGER_NEXT_ACTIONS#ai-office
- Promotion Agent Create:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=PROMOTION#ai-office
- Fan Relation Agent Create:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=FAN_RELATION#ai-office
- Finance Agent Create:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=FINANCE#ai-office
- Finance Agent Inbox:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=FINANCE&aiOfficeInboxRole=FINANCE#ai-office
- Fan Relation Agent Inbox:
  - http://127.0.0.1:3001/kazu/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=FAN_RELATION&aiOfficeInboxRole=FAN_RELATION#ai-office

## Related Surfaces

- Posting compose:
  - http://127.0.0.1:3001/kazu/mypage/support-page?manualCheck=1#posting-compose
- Advanced settlement:
  - http://127.0.0.1:3001/kazu/mypage/advanced?manualCheck=1

## Suggested Screenshot Order

1. `01-settings-ai-office-entry.png`
   - open: Home / AIアシスタント
2. `02-create-manager-task.png`
   - open: Manager Agent Create
3. `03-manager-task-created.png`
   - after create: ホームの最近の作成履歴 or 受信トレイ
4. `04-manager-task-detail.png`
   - open: Manager Agent Detail
5. `05-approval-queue.png`
   - open: 受信トレイ
6. `06-approval-result.png`
   - after approve or reject
7. `07-inbox-role-filter.png`
   - open: Finance Agent Inbox or Fan Relation Agent Inbox

## Notes

- `notes.md` を同じディレクトリで更新する
- 実画面キャプチャには URL、active tab、主要見出しが入るようにする
- `DISTRIBUTION_PLAN_DRAFT` は project / summary / settlement 文脈があるときに full セットで回す
