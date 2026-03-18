#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const DEFAULT_TIME_ZONE = "Asia/Tokyo";
const ARTIFACT_ROOT = path.join(
  "docs",
  "runbooks",
  "artifacts",
  "ai-office-manual-check"
);
const MINIMUM_SCREENSHOTS = [
  "01-settings-ai-office-entry.png",
  "02-create-manager-task.png",
  "03-manager-task-created.png",
  "04-manager-task-detail.png",
];

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
    date: getTodayInTimeZone(DEFAULT_TIME_ZONE),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
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

function extractSection(content, heading, nextHeading) {
  const start = content.indexOf(heading);
  if (start === -1) {
    return "";
  }

  const from = start + heading.length;
  const end = nextHeading.length > 0 ? content.indexOf(nextHeading, from) : -1;
  if (end === -1) {
    return content.slice(from);
  }

  return content.slice(from, end);
}

function parseChecklistItems(sectionContent) {
  const items = [];
  const lines = sectionContent.split("\n");

  for (const line of lines) {
    const match = line.match(/^- \[( |x)\] (.+)$/);
    if (!match) {
      continue;
    }
    items.push({
      checked: match[1] === "x",
      label: match[2],
    });
  }

  return items;
}

function countChecked(items) {
  return items.filter((item) => item.checked).length;
}

function buildStatusDocument({
  date,
  minimumItems,
  preflightItems,
  capturedShots,
  missingShots,
}) {
  const checkedMinimum = countChecked(minimumItems);
  const checkedPreflight = countChecked(preflightItems);
  const remainingMinimum = minimumItems.filter((item) => !item.checked);
  const statusLabel =
    checkedMinimum === minimumItems.length &&
    checkedPreflight === preflightItems.length &&
    missingShots.length === 0
      ? "complete"
      : "in_progress";

  const minimumLines =
    remainingMinimum.length > 0
      ? remainingMinimum.map((item) => `- ${item.label}`).join("\n")
      : "- なし";
  const screenshotLines =
    missingShots.length > 0
      ? missingShots.map((fileName) => `- ${fileName}`).join("\n")
      : "- なし";
  const capturedLines =
    capturedShots.length > 0
      ? capturedShots.map((fileName) => `- ${fileName}`).join("\n")
      : "- まだありません";

  return `# AI Office Manual Check Status

- 日付: ${date}
- 状態: \`${statusLabel}\`
- Minimum Checklist: ${checkedMinimum}/${minimumItems.length}
- Machine-Checked Preflight: ${checkedPreflight}/${preflightItems.length}
- Minimum screenshots: ${capturedShots.length}/${MINIMUM_SCREENSHOTS.length}

## Captured Minimum Screenshots

${capturedLines}

## Remaining Minimum Checklist

${minimumLines}

## Missing Minimum Screenshots

${screenshotLines}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(process.cwd(), ARTIFACT_ROOT, args.date);
  const notesPath = path.join(artifactDir, "notes.md");
  const statusPath = path.join(artifactDir, "status.md");

  if (!fs.existsSync(notesPath)) {
    process.stderr.write(`notes not found: ${notesPath}\n`);
    process.exitCode = 1;
    return;
  }

  const notesContent = fs.readFileSync(notesPath, "utf8");
  const minimumSection = extractSection(
    notesContent,
    "## Minimum Checklist\n",
    "## Machine-Checked Preflight\n"
  );
  const preflightSection = extractSection(
    notesContent,
    "## Machine-Checked Preflight\n",
    "## Memo\n"
  );

  const minimumItems = parseChecklistItems(minimumSection);
  const preflightItems = parseChecklistItems(preflightSection);
  const artifactFiles = fs.existsSync(artifactDir) ? fs.readdirSync(artifactDir) : [];
  const capturedShots = MINIMUM_SCREENSHOTS.filter((fileName) =>
    artifactFiles.includes(fileName)
  );
  const missingShots = MINIMUM_SCREENSHOTS.filter(
    (fileName) => !capturedShots.includes(fileName)
  );

  const statusDocument = buildStatusDocument({
    date: args.date,
    minimumItems,
    preflightItems,
    capturedShots,
    missingShots,
  });

  fs.writeFileSync(statusPath, statusDocument, "utf8");

  process.stdout.write(`wrote: ${path.relative(process.cwd(), statusPath)}\n`);
  process.stdout.write(
    `minimum checklist: ${countChecked(minimumItems)}/${minimumItems.length}\n`
  );
  process.stdout.write(
    `preflight: ${countChecked(preflightItems)}/${preflightItems.length}\n`
  );
  process.stdout.write(
    `minimum screenshots: ${capturedShots.length}/${MINIMUM_SCREENSHOTS.length}\n`
  );
}

main();
