import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export const AI_OFFICE_RECENT_ROLE_SHORTCUTS_STORAGE_KEY =
  "cf:ai-office:recent-role-shortcuts";
export const AI_OFFICE_RECENT_COPIED_ROLE_LINKS_STORAGE_KEY =
  "cf:ai-office:recent-copied-role-links";

export type AiOfficeRecentRoleShortcutView = "CREATE" | "INBOX";

export type AiOfficeRecentRoleShortcut = {
  roleId: CreatorAiAgentRole;
  activeView: AiOfficeRecentRoleShortcutView;
  lastUsedAt: string;
};

export type AiOfficeRecentCopiedRoleLink = {
  roleId: CreatorAiAgentRole;
  activeView: AiOfficeRecentRoleShortcutView;
  copiedAt: string;
};

function isAiOfficeRecentRoleShortcutView(
  value: unknown
): value is AiOfficeRecentRoleShortcutView {
  return value === "CREATE" || value === "INBOX";
}

export function parseAiOfficeRecentRoleShortcuts(
  value: unknown
): AiOfficeRecentRoleShortcut[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const roleId = toCreatorAiAgentRole(Reflect.get(item, "roleId"));
    const activeView = Reflect.get(item, "activeView");
    const lastUsedAt = Reflect.get(item, "lastUsedAt");

    if (
      roleId === null ||
      !isAiOfficeRecentRoleShortcutView(activeView) ||
      typeof lastUsedAt !== "string"
    ) {
      return [];
    }

    return [{ roleId, activeView, lastUsedAt }];
  });
}

export function rememberAiOfficeRecentRoleShortcut(
  shortcuts: readonly AiOfficeRecentRoleShortcut[],
  shortcut: {
    roleId: CreatorAiAgentRole;
    activeView: AiOfficeRecentRoleShortcutView;
    lastUsedAt: string;
  },
  limit = 4
): AiOfficeRecentRoleShortcut[] {
  return [
    shortcut,
    ...shortcuts.filter(
      (item) =>
        !(
          item.roleId === shortcut.roleId &&
          item.activeView === shortcut.activeView
        )
    ),
  ].slice(0, limit);
}

export function formatAiOfficeRecentRoleShortcutTime(
  lastUsedAt: string,
  now: Date = new Date()
): string {
  const lastUsedTime = new Date(lastUsedAt).getTime();

  if (Number.isNaN(lastUsedTime)) {
    return "日時不明";
  }

  const diffMs = Math.max(0, now.getTime() - lastUsedTime);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "たった今";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }

  return new Date(lastUsedTime).toISOString().slice(0, 10);
}

function toShortcutPriorityTimestamp(lastUsedAt: string): number {
  const timestamp = new Date(lastUsedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortAiOfficeRecentRoleShortcutsByPriority<
  T extends {
    ignoredCount: number;
    waitingApprovalCount: number;
    lastUsedAt: string;
    activeView: AiOfficeRecentRoleShortcutView;
  },
>(shortcuts: readonly T[]): T[] {
  return [...shortcuts].sort((left, right) => {
    if (right.ignoredCount !== left.ignoredCount) {
      return right.ignoredCount - left.ignoredCount;
    }

    if (right.waitingApprovalCount !== left.waitingApprovalCount) {
      return right.waitingApprovalCount - left.waitingApprovalCount;
    }

    if (left.activeView !== right.activeView) {
      return left.activeView === "INBOX" ? -1 : 1;
    }

    return (
      toShortcutPriorityTimestamp(right.lastUsedAt) -
      toShortcutPriorityTimestamp(left.lastUsedAt)
    );
  });
}

export function parseAiOfficeRecentCopiedRoleLinks(
  value: unknown
): AiOfficeRecentCopiedRoleLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const roleId = toCreatorAiAgentRole(Reflect.get(item, "roleId"));
    const activeView = Reflect.get(item, "activeView");
    const copiedAt = Reflect.get(item, "copiedAt");

    if (
      roleId === null ||
      !isAiOfficeRecentRoleShortcutView(activeView) ||
      typeof copiedAt !== "string"
    ) {
      return [];
    }

    return [{ roleId, activeView, copiedAt }];
  });
}

export function rememberAiOfficeRecentCopiedRoleLink(
  links: readonly AiOfficeRecentCopiedRoleLink[],
  link: AiOfficeRecentCopiedRoleLink,
  limit = 6
): AiOfficeRecentCopiedRoleLink[] {
  return [
    link,
    ...links.filter(
      (item) =>
        !(item.roleId === link.roleId && item.activeView === link.activeView)
    ),
  ].slice(0, limit);
}

export function sortAiOfficeRecentCopiedRoleLinksByRecency<
  T extends {
    copiedAt: string;
  },
>(links: readonly T[]): T[] {
  return [...links].sort(
    (left, right) =>
      toShortcutPriorityTimestamp(right.copiedAt) -
      toShortcutPriorityTimestamp(left.copiedAt)
  );
}
