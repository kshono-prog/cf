#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_USERNAME = "kazu";
const REQUEST_TIMEOUT_MS = 60000;

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    username: DEFAULT_USERNAME,
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
    }
  }

  return args;
}

function buildChecks(username) {
  return [
    {
      label: "mypage root (daily-work initial view)",
      path: `/${username}/mypage`,
      expected: ["設定を読み込み中です", "mypage/page.tsx"],
    },
    {
      label: "mypage daily-work route",
      path: `/${username}/mypage/daily-work`,
      expected: ["設定を読み込み中です", "mypage/daily-work/page.tsx"],
    },
    {
      label: "mypage settings route",
      path: `/${username}/mypage/settings`,
      expected: ["設定を読み込み中です", "mypage/settings/page.tsx"],
    },
    // backward-compat redirect routes (still exist as pages)
    {
      label: "mypage supporters (compat redirect → daily-work)",
      path: `/${username}/mypage/supporters`,
      expected: ["設定を読み込み中です"],
    },
    {
      label: "mypage advanced (compat redirect → settings)",
      path: `/${username}/mypage/advanced`,
      expected: ["設定を読み込み中です"],
    },
  ];
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
      },
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const checks = buildChecks(args.username);
  const failures = [];

  for (const check of checks) {
    const url = new URL(check.path, args.baseUrl).toString();
    process.stdout.write(`checking: ${check.label} -> ${url}\n`);

    let result;
    try {
      result = await fetchHtml(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown fetch error";
      failures.push(`${check.label}: request failed (${message})`);
      continue;
    }

    if (!result.ok) {
      failures.push(`${check.label}: returned HTTP ${result.status}`);
      continue;
    }

    const missing = check.expected.filter((text) => !result.body.includes(text));
    if (missing.length > 0) {
      failures.push(
        `${check.label}: missing expected text -> ${missing.join(", ")}`
      );
      continue;
    }

    process.stdout.write(`ok: ${check.label}\n`);
  }

  if (failures.length > 0) {
    process.stderr.write("AI Office manual-check smoke failed.\n");
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write("AI Office manual-check smoke passed.\n");
}

void main();
