#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_USERNAME = "kazu";
const DEFAULT_TIME_ZONE = "Asia/Tokyo";
const ARTIFACT_ROOT = path.join(
  "docs",
  "runbooks",
  "artifacts",
  "ai-office-manual-check"
);

function getTodayInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("failed to build date parts");
  }

  return `${year}-${month}-${day}`;
}

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    username: DEFAULT_USERNAME,
    date: getTodayInTimeZone(DEFAULT_TIME_ZONE),
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (part === "--base-url") {
      const next = argv[index + 1];
      if (typeof next === "string" && next.length > 0) {
        args.baseUrl = next;
        index += 1;
      }
      continue;
    }
    if (part === "--username") {
      const next = argv[index + 1];
      if (typeof next === "string" && next.length > 0) {
        args.username = next;
        index += 1;
      }
      continue;
    }
    if (part === "--date") {
      const next = argv[index + 1];
      if (typeof next === "string" && next.length > 0) {
        args.date = next;
        index += 1;
      }
      continue;
    }
    if (part === "--force") {
      args.force = true;
    }
  }

  return args;
}

function buildNotesTemplate({ date, username, artifactDir }) {
  return `# AI Office Manual Check Notes

- 実施日: ${date}
- 確認者:
- 対象 creator: \`${username}\`
- 実施セット: \`minimum\`
- 保存先: \`${artifactDir}/\`
- 事前スモーク確認:
  - 未実行
- 取得したスクリーンショット:
  - \`01-settings-ai-office-entry.png\`
  - \`02-create-manager-task.png\`
  - \`03-manager-task-created.png\`
  - \`04-manager-task-detail.png\`
- 確認した task:
  - \`MANAGER_NEXT_ACTIONS\`
- 期待どおりだった点:
- 違和感があった文言や UI:
- エラーコード:
- 一言評価:
- 次に直したい点:

## Minimum Checklist

### ワークスペース導線
- [ ] \`/<username>/mypage\` で \`ホーム\` が初期表示される
- [ ] \`/<username>/mypage/daily-work\` で同じ \`ホーム\` を開ける
- [ ] \`/<username>/mypage/settings\` で \`設定\` を開ける
- [ ] ヘッダーの \`ホーム / 設定\` でビューを切り替えられる

### AIアシスタント
- [ ] \`ホーム\` の上部付近に \`AIアシスタント\` パネルが見える
- [ ] \`作成\` で \`Manager Agent\` が選べる
- [ ] \`Manager Agent の次アクションを整理する\` を作成できる
- [ ] \`ホーム\` の最近の作成履歴または \`受信トレイ\` で detail を開ける
- [ ] \`受信トレイ\` の role chip で絞り込める
- [ ] role を選んだ \`作成 / 受信トレイ\` の URL をリロードしても文脈が維持される
- [ ] \`最近使った role 導線\` と \`最近コピーした role link\` が必要に応じて見える

### 後方互換
- [ ] \`/<username>/mypage/supporters\` で \`ホーム\` に入れる
- [ ] \`/<username>/mypage/advanced\` で \`設定\` に入れる

## Machine-Checked Preflight

- [ ] \`npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3000 --username ${username}\`
- [ ] \`/<username>/mypage\` (home initial view)
- [ ] \`/<username>/mypage/daily-work\`
- [ ] \`/<username>/mypage/settings\`
- [ ] \`/<username>/mypage/supporters\` (compat redirect)
- [ ] \`/<username>/mypage/advanced\` (compat redirect)
- [ ] local dev の route readiness が通る
- [ ] hydrated UI の task detail / screenshot は未確認

## Memo

- \`links.md\` を横に置いて、deep link とスクリーンショット名を見ながら確認する
- \`Finance Agent\` と \`配分と精算 -> Draft\` の確認は full セットで回す
`;
}

function buildLinksDocument({ baseUrl, username, date, artifactDir }) {
  const homeAiAssistantUrl = `${baseUrl}/${username}/mypage?manualCheck=1#ai-office`;
  const managerCreateUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=MANAGER#ai-office`;
  const managerDetailUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=MANAGER&aiOfficeInboxRole=MANAGER&aiOfficeOpenLatestTaskType=MANAGER_NEXT_ACTIONS#ai-office`;
  const promotionCreateUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=PROMOTION#ai-office`;
  const financeCreateUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=FINANCE#ai-office`;
  const financeInboxUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=FINANCE&aiOfficeInboxRole=FINANCE#ai-office`;
  const fanRelationInboxUrl = `${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=FAN_RELATION&aiOfficeInboxRole=FAN_RELATION#ai-office`;
  const supportPageUrl = `${baseUrl}/${username}/mypage/support-page?manualCheck=1#posting-compose`;
  const advancedUrl = `${baseUrl}/${username}/mypage/advanced?manualCheck=1`;
  const settingsUrl = `${baseUrl}/${username}/mypage/settings?manualCheck=1`;
  const dailyWorkUrl = `${baseUrl}/${username}/mypage/daily-work?manualCheck=1#ai-office`;

  return `# AI Office Manual Check Links

- 日付: ${date}
- 対象 creator: \`${username}\`
- 保存先: \`${artifactDir}/\`
- 事前スモーク:
  - \`npm run manual-check:ai-office:smoke -- --base-url ${baseUrl} --username ${username}\`

## Minimum Deep Links

- Home / AIアシスタント:
  - ${homeAiAssistantUrl}
- Daily-work route:
  - ${dailyWorkUrl}
- Settings route:
  - ${settingsUrl}
- Manager Agent Create:
  - ${managerCreateUrl}
- Manager Agent Detail:
  - ${managerDetailUrl}
- Promotion Agent Create:
  - ${promotionCreateUrl}
- Fan Relation Agent Create:
  - ${baseUrl}/${username}/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=FAN_RELATION#ai-office
- Finance Agent Create:
  - ${financeCreateUrl}
- Finance Agent Inbox:
  - ${financeInboxUrl}
- Fan Relation Agent Inbox:
  - ${fanRelationInboxUrl}

## Related Surfaces

- Posting compose:
  - ${supportPageUrl}
- Advanced settlement:
  - ${advancedUrl}

## Suggested Screenshot Order

1. \`01-settings-ai-office-entry.png\`
   - open: Home / AIアシスタント
2. \`02-create-manager-task.png\`
   - open: Manager Agent Create
3. \`03-manager-task-created.png\`
   - after create: ホームの最近の作成履歴 or 受信トレイ
4. \`04-manager-task-detail.png\`
   - open: Manager Agent Detail
5. \`05-approval-queue.png\`
   - open: 受信トレイ
6. \`06-approval-result.png\`
   - after approve or reject
7. \`07-inbox-role-filter.png\`
   - open: Finance Agent Inbox or Fan Relation Agent Inbox

## Notes

- \`notes.md\` を同じディレクトリで更新する
- 実画面キャプチャには URL、active tab、主要見出しが入るようにする
- \`DISTRIBUTION_PLAN_DRAFT\` は project / summary / settlement 文脈があるときに full セットで回す
`;
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeFileIfNeeded(filePath, content, force) {
  if (!force && fs.existsSync(filePath)) {
    return false;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, args.date);
  const absoluteArtifactDir = path.join(process.cwd(), artifactDir);
  const notesPath = path.join(absoluteArtifactDir, "notes.md");
  const linksPath = path.join(absoluteArtifactDir, "links.md");

  ensureDirectory(absoluteArtifactDir);

  const wroteNotes = writeFileIfNeeded(
    notesPath,
    buildNotesTemplate({
      date: args.date,
      username: args.username,
      artifactDir,
    }),
    args.force
  );

  fs.writeFileSync(
    linksPath,
    buildLinksDocument({
      baseUrl: args.baseUrl,
      username: args.username,
      date: args.date,
      artifactDir,
    }),
    "utf8"
  );

  process.stdout.write(`prepared: ${artifactDir}\n`);
  process.stdout.write(`- links: ${path.relative(process.cwd(), linksPath)}\n`);
  process.stdout.write(
    `- notes: ${path.relative(process.cwd(), notesPath)} ${
      wroteNotes ? "(created)" : "(kept existing)"
    }\n`
  );
}

main();
