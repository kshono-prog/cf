#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_USERNAME = "kazu";
const DEFAULT_TIME_ZONE = "Asia/Tokyo";

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
    }
  }

  return args;
}

function runNodeScript(scriptName, args) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function replaceSection(content, heading, nextHeading, replacement) {
  const start = content.indexOf(heading);
  if (start === -1) {
    return content;
  }

  const searchFrom = start + heading.length;
  const end =
    nextHeading.length > 0 ? content.indexOf(nextHeading, searchFrom) : -1;

  if (end === -1) {
    return `${content.slice(0, start)}${replacement}`;
  }

  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
}

function updateNotesPreflight({ artifactDir, baseUrl, username }) {
  const notesPath = path.join(process.cwd(), artifactDir, "notes.md");
  if (!fs.existsSync(notesPath)) {
    return;
  }

  const executedCommand = `npm run manual-check:ai-office:smoke -- --base-url ${baseUrl} --username ${username}`;
  const preflightHeading = "## Machine-Checked Preflight\n";
  const memoHeading = "## Memo\n";
  const preflightSection = `${preflightHeading}
- [x] \`${executedCommand}\`
- [x] \`/<username>/mypage\` (home initial view)
- [x] \`/<username>/mypage/daily-work\`
- [x] \`/<username>/mypage/settings\`
- [x] \`/<username>/mypage/supporters\` (compat redirect)
- [x] \`/<username>/mypage/advanced\` (compat redirect)
- [x] local dev の route readiness が通る
- [ ] hydrated UI の task detail / screenshot は未確認

`;

  let content = fs.readFileSync(notesPath, "utf8");
  content = content.replace(
    /- 事前スモーク確認:\n(?:  - .*\n)+/,
    `- 事前スモーク確認:\n  - 実行済み: \`${executedCommand}\`\n  - 結果: \`mypage / daily-work / settings / supporters / advanced\` の 5 route が 200 で応答し、SSR loading shell と route marker を確認\n`
  );
  content = replaceSection(content, preflightHeading, memoHeading, preflightSection);
  fs.writeFileSync(notesPath, content, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sharedArgs = [
    "--base-url",
    args.baseUrl,
    "--username",
    args.username,
    "--date",
    args.date,
  ];

  const prepareResult = runNodeScript(
    "prepareAiOfficeManualCheck.cjs",
    sharedArgs
  );
  if (typeof prepareResult.status === "number" && prepareResult.status !== 0) {
    process.exitCode = prepareResult.status;
    return;
  }

  const smokeResult = runNodeScript("checkAiOfficeManualCheck.cjs", [
    "--base-url",
    args.baseUrl,
    "--username",
    args.username,
  ]);
  if (typeof smokeResult.status === "number" && smokeResult.status !== 0) {
    process.exitCode = smokeResult.status;
    return;
  }

  const artifactDir = path.join(
    "docs",
    "runbooks",
    "artifacts",
    "ai-office-manual-check",
    args.date
  );
  updateNotesPreflight({
    artifactDir,
    baseUrl: args.baseUrl,
    username: args.username,
  });
  const statusResult = runNodeScript("reportAiOfficeManualCheckStatus.cjs", [
    "--date",
    args.date,
  ]);
  if (typeof statusResult.status === "number" && statusResult.status !== 0) {
    process.exitCode = statusResult.status;
    return;
  }

  const homeAiAssistantUrl = `${args.baseUrl}/${args.username}/mypage?manualCheck=1#ai-office`;
  const managerCreateUrl = `${args.baseUrl}/${args.username}/mypage?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=MANAGER#ai-office`;
  const managerDetailUrl = `${args.baseUrl}/${args.username}/mypage?manualCheck=1&aiOfficeView=INBOX&aiOfficeRole=MANAGER&aiOfficeInboxRole=MANAGER&aiOfficeOpenLatestTaskType=MANAGER_NEXT_ACTIONS#ai-office`;

  process.stdout.write("\nAI Office minimum manual check is prepared.\n");
  process.stdout.write(`- artifact: ${artifactDir}\n`);
  process.stdout.write(`- start here: ${homeAiAssistantUrl}\n`);
  process.stdout.write(`- manager create: ${managerCreateUrl}\n`);
  process.stdout.write(`- manager detail: ${managerDetailUrl}\n`);
  process.stdout.write(`- update notes: ${artifactDir}/notes.md\n`);
  process.stdout.write(`- status: ${artifactDir}/status.md\n`);
  process.stdout.write(`- open links: ${artifactDir}/links.md\n`);
}

main();
