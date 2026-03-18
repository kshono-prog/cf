import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAiOfficeRecentRoleShortcutTime,
  parseAiOfficeRecentCopiedRoleLinks,
  parseAiOfficeRecentRoleShortcuts,
  rememberAiOfficeRecentCopiedRoleLink,
  rememberAiOfficeRecentRoleShortcut,
  sortAiOfficeRecentCopiedRoleLinksByRecency,
  sortAiOfficeRecentRoleShortcutsByPriority,
} from "../components/mypage/aiOfficeRecentRoleShortcuts";

test("AI Office recent role shortcuts parser keeps only valid rows", () => {
  const parsed = parseAiOfficeRecentRoleShortcuts([
    {
      roleId: "PROMOTION",
      activeView: "CREATE",
      lastUsedAt: "2026-03-18T00:00:00.000Z",
    },
    {
      roleId: "UNKNOWN",
      activeView: "CREATE",
      lastUsedAt: "2026-03-18T00:00:00.000Z",
    },
    {
      roleId: "FINANCE",
      activeView: "DETAIL",
      lastUsedAt: "2026-03-18T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(parsed, [
    {
      roleId: "PROMOTION",
      activeView: "CREATE",
      lastUsedAt: "2026-03-18T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent role shortcuts move the latest duplicate to the front", () => {
  const next = rememberAiOfficeRecentRoleShortcut(
    [
      {
        roleId: "MANAGER",
        activeView: "CREATE",
        lastUsedAt: "2026-03-18T00:00:00.000Z",
      },
      {
        roleId: "PROMOTION",
        activeView: "INBOX",
        lastUsedAt: "2026-03-17T00:00:00.000Z",
      },
    ],
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      lastUsedAt: "2026-03-19T00:00:00.000Z",
    }
  );

  assert.deepEqual(next, [
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      lastUsedAt: "2026-03-19T00:00:00.000Z",
    },
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      lastUsedAt: "2026-03-17T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent role shortcuts keep the newest entries within the limit", () => {
  const next = rememberAiOfficeRecentRoleShortcut(
    [
      {
        roleId: "MANAGER",
        activeView: "CREATE",
        lastUsedAt: "2026-03-15T00:00:00.000Z",
      },
      {
        roleId: "PROMOTION",
        activeView: "CREATE",
        lastUsedAt: "2026-03-14T00:00:00.000Z",
      },
      {
        roleId: "FINANCE",
        activeView: "INBOX",
        lastUsedAt: "2026-03-13T00:00:00.000Z",
      },
      {
        roleId: "FAN_RELATION",
        activeView: "CREATE",
        lastUsedAt: "2026-03-12T00:00:00.000Z",
      },
    ],
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      lastUsedAt: "2026-03-19T00:00:00.000Z",
    }
  );

  assert.deepEqual(next, [
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      lastUsedAt: "2026-03-19T00:00:00.000Z",
    },
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      lastUsedAt: "2026-03-15T00:00:00.000Z",
    },
    {
      roleId: "PROMOTION",
      activeView: "CREATE",
      lastUsedAt: "2026-03-14T00:00:00.000Z",
    },
    {
      roleId: "FINANCE",
      activeView: "INBOX",
      lastUsedAt: "2026-03-13T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent role shortcuts formatter renders relative labels", () => {
  assert.equal(
    formatAiOfficeRecentRoleShortcutTime(
      "2026-03-19T11:59:30.000Z",
      new Date("2026-03-19T12:00:00.000Z")
    ),
    "たった今"
  );
  assert.equal(
    formatAiOfficeRecentRoleShortcutTime(
      "2026-03-19T11:30:00.000Z",
      new Date("2026-03-19T12:00:00.000Z")
    ),
    "30分前"
  );
  assert.equal(
    formatAiOfficeRecentRoleShortcutTime(
      "2026-03-19T09:00:00.000Z",
      new Date("2026-03-19T12:00:00.000Z")
    ),
    "3時間前"
  );
  assert.equal(
    formatAiOfficeRecentRoleShortcutTime(
      "2026-03-17T12:00:00.000Z",
      new Date("2026-03-19T12:00:00.000Z")
    ),
    "2日前"
  );
  assert.equal(
    formatAiOfficeRecentRoleShortcutTime(
      "2026-03-01T12:00:00.000Z",
      new Date("2026-03-19T12:00:00.000Z")
    ),
    "2026-03-01"
  );
  assert.equal(formatAiOfficeRecentRoleShortcutTime("invalid-date"), "日時不明");
});

test("AI Office recent role shortcuts sort stale and waiting items before recency", () => {
  const sorted = sortAiOfficeRecentRoleShortcutsByPriority([
    {
      roleId: "MANAGER" as const,
      activeView: "CREATE" as const,
      lastUsedAt: "2026-03-19T12:00:00.000Z",
      waitingApprovalCount: 0,
      ignoredCount: 0,
    },
    {
      roleId: "PROMOTION" as const,
      activeView: "CREATE" as const,
      lastUsedAt: "2026-03-18T12:00:00.000Z",
      waitingApprovalCount: 2,
      ignoredCount: 0,
    },
    {
      roleId: "FINANCE" as const,
      activeView: "INBOX" as const,
      lastUsedAt: "2026-03-17T12:00:00.000Z",
      waitingApprovalCount: 1,
      ignoredCount: 1,
    },
    {
      roleId: "FAN_RELATION" as const,
      activeView: "INBOX" as const,
      lastUsedAt: "2026-03-16T12:00:00.000Z",
      waitingApprovalCount: 1,
      ignoredCount: 0,
    },
  ]);

  assert.deepEqual(
    sorted.map((shortcut) => shortcut.roleId),
    ["FINANCE", "PROMOTION", "FAN_RELATION", "MANAGER"]
  );
});

test("AI Office recent copied role links parser keeps only valid rows", () => {
  const parsed = parseAiOfficeRecentCopiedRoleLinks([
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      copiedAt: "2026-03-18T00:00:00.000Z",
    },
    {
      roleId: "UNKNOWN",
      activeView: "INBOX",
      copiedAt: "2026-03-18T00:00:00.000Z",
    },
    {
      roleId: "FINANCE",
      activeView: "DETAIL",
      copiedAt: "2026-03-18T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(parsed, [
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      copiedAt: "2026-03-18T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent copied role links move the latest duplicate to the front", () => {
  const next = rememberAiOfficeRecentCopiedRoleLink(
    [
      {
        roleId: "MANAGER",
        activeView: "CREATE",
        copiedAt: "2026-03-18T00:00:00.000Z",
      },
      {
        roleId: "PROMOTION",
        activeView: "INBOX",
        copiedAt: "2026-03-17T00:00:00.000Z",
      },
    ],
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      copiedAt: "2026-03-19T00:00:00.000Z",
    }
  );

  assert.deepEqual(next, [
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      copiedAt: "2026-03-19T00:00:00.000Z",
    },
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      copiedAt: "2026-03-17T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent copied role links keep the newest entries within the limit", () => {
  const next = rememberAiOfficeRecentCopiedRoleLink(
    [
      {
        roleId: "MANAGER",
        activeView: "CREATE",
        copiedAt: "2026-03-15T00:00:00.000Z",
      },
      {
        roleId: "PROMOTION",
        activeView: "CREATE",
        copiedAt: "2026-03-14T00:00:00.000Z",
      },
      {
        roleId: "FINANCE",
        activeView: "INBOX",
        copiedAt: "2026-03-13T00:00:00.000Z",
      },
      {
        roleId: "FAN_RELATION",
        activeView: "CREATE",
        copiedAt: "2026-03-12T00:00:00.000Z",
      },
      {
        roleId: "PROMOTION",
        activeView: "INBOX",
        copiedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        roleId: "FAN_RELATION",
        activeView: "INBOX",
        copiedAt: "2026-03-10T00:00:00.000Z",
      },
    ],
    {
      roleId: "FINANCE",
      activeView: "CREATE",
      copiedAt: "2026-03-19T00:00:00.000Z",
    }
  );

  assert.deepEqual(next, [
    {
      roleId: "FINANCE",
      activeView: "CREATE",
      copiedAt: "2026-03-19T00:00:00.000Z",
    },
    {
      roleId: "MANAGER",
      activeView: "CREATE",
      copiedAt: "2026-03-15T00:00:00.000Z",
    },
    {
      roleId: "PROMOTION",
      activeView: "CREATE",
      copiedAt: "2026-03-14T00:00:00.000Z",
    },
    {
      roleId: "FINANCE",
      activeView: "INBOX",
      copiedAt: "2026-03-13T00:00:00.000Z",
    },
    {
      roleId: "FAN_RELATION",
      activeView: "CREATE",
      copiedAt: "2026-03-12T00:00:00.000Z",
    },
    {
      roleId: "PROMOTION",
      activeView: "INBOX",
      copiedAt: "2026-03-11T00:00:00.000Z",
    },
  ]);
});

test("AI Office recent copied role links sort by recency", () => {
  const sorted = sortAiOfficeRecentCopiedRoleLinksByRecency([
    {
      roleId: "MANAGER" as const,
      activeView: "CREATE" as const,
      copiedAt: "2026-03-17T12:00:00.000Z",
    },
    {
      roleId: "PROMOTION" as const,
      activeView: "INBOX" as const,
      copiedAt: "2026-03-19T12:00:00.000Z",
    },
    {
      roleId: "FINANCE" as const,
      activeView: "CREATE" as const,
      copiedAt: "2026-03-18T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    sorted.map((link) => `${link.roleId}:${link.activeView}`),
    ["PROMOTION:INBOX", "FINANCE:CREATE", "MANAGER:CREATE"]
  );
});
