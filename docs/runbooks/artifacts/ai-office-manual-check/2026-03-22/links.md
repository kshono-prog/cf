# AI Office Manual Check Links

- 日付: 2026-03-22
- 対象 creator: `kazu`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-22/`
- 事前スモーク:
  - `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3000 --username kazu`

## Minimum Deep Links

- Settings / AI Office:
  - http://127.0.0.1:3000/kazu/mypage#ai-office-phase1
- Manager Agent Create:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=CREATE#ai-office-phase1
- Promotion Agent Create:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=CREATE&aiOfficeRole=PROMOTION#ai-office-phase1
- Fan Relation Agent Create:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=CREATE&aiOfficeRole=FAN_RELATION#ai-office-phase1
- Finance Agent Create:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=CREATE&aiOfficeRole=FINANCE#ai-office-phase1
- Finance Agent Inbox:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=INBOX&aiOfficeRole=FINANCE&aiOfficeInboxRole=FINANCE#ai-office-phase1
- Fan Relation Agent Inbox:
  - http://127.0.0.1:3000/kazu/mypage?aiOfficeView=INBOX&aiOfficeRole=FAN_RELATION&aiOfficeInboxRole=FAN_RELATION#ai-office-phase1

## Related Surfaces

- Posting compose:
  - http://127.0.0.1:3000/kazu/mypage/support-page#posting-compose
- Advanced settlement:
  - http://127.0.0.1:3000/kazu/mypage/advanced

## Suggested Screenshot Order

1. `01-settings-ai-office-entry.png`
   - open: Settings / AI Office
2. `02-create-manager-task.png`
   - open: Manager Agent Create
3. `03-manager-task-created.png`
   - after create: same route or Inbox
4. `04-manager-task-detail.png`
   - after open detail from `承認待ち` or `最近作った内容`
5. `05-approval-queue.png`
   - open: Inbox with approval queue visible
6. `06-approval-result.png`
   - after approve or reject
7. `07-inbox-role-filter.png`
   - open: Finance Agent Inbox or Fan Relation Agent Inbox

## Notes

- `notes.md` を同じディレクトリで更新する
- 実画面キャプチャには URL、active tab、主要見出しが入るようにする
- `DISTRIBUTION_PLAN_DRAFT` は project / summary / settlement 文脈があるときに full セットで回す
