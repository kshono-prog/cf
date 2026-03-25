import {
  getAiOfficeRoleChoices,
  getAiOfficeRoleGuidance,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AgentTaskView,
  AiOfficeContentSummaryView,
  AiOfficeUsefulnessSummaryView,
} from "@/components/mypage/aiOfficeTypes";
import { isRecord } from "@/lib/api/guards";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type CreatorReadyHomeAction =
  | {
      kind: "href";
      label: string;
      href: string;
    }
  | {
      kind: "settings";
      label: string;
    };

export type CreatorReadyAiManagerCard = {
  id: string;
  tone: "attention" | "recommended" | "neutral";
  title: string;
  body: string;
  action: CreatorReadyHomeAction;
  badge?: string;
};

export type CreatorReadyTaskItem = {
  id: string;
  title: string;
  body: string;
  owner: "CREATOR" | "AI_OFFICE" | "SHARED";
  priority: "high" | "medium" | "low";
  action: CreatorReadyHomeAction;
};

type DailyAction = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: string;
};

type DailyActionPlanOutputView = {
  summary: string;
  actions: DailyAction[];
};

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function isDailyPriority(v: unknown): v is DailyAction["priority"] {
  return v === "high" || v === "medium" || v === "low";
}

function parseDailyActionPlanOutput(v: unknown): DailyActionPlanOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const actions: DailyAction[] = [];
  for (const item of asArray(v.actions)) {
    if (!isRecord(item)) continue;
    const id = asStringOrNull(item.id);
    const title = asStringOrNull(item.title);
    const reason = asStringOrNull(item.reason);
    const priority = item.priority;
    const category = asStringOrNull(item.category) ?? "general";
    if (!id || !title || !reason || !isDailyPriority(priority)) continue;
    actions.push({ id, title, reason, priority, category });
  }

  return {
    summary,
    actions,
  };
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24)));
}

function latestTaskOfType(
  tasks: readonly AgentTaskView[],
  taskType: string
): AgentTaskView | null {
  return tasks.find((task) => task.taskType === taskType) ?? null;
}

function pushCardIfMissing(
  cards: CreatorReadyAiManagerCard[],
  card: CreatorReadyAiManagerCard
): void {
  if (cards.some((current) => current.id === card.id)) {
    return;
  }
  cards.push(card);
}

function pushTaskIfMissing(
  items: CreatorReadyTaskItem[],
  item: CreatorReadyTaskItem
): void {
  if (items.some((current) => current.id === item.id)) {
    return;
  }
  items.push(item);
}

function sortTaskItems(items: CreatorReadyTaskItem[]): CreatorReadyTaskItem[] {
  const priorityRank: Record<CreatorReadyTaskItem["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...items].sort(
    (left, right) =>
      priorityRank[left.priority] - priorityRank[right.priority] ||
      left.title.localeCompare(right.title)
  );
}

export function buildCreatorReadyAiManagerCards(args: {
  tasks: readonly AgentTaskView[];
  usefulness: AiOfficeUsefulnessSummaryView;
  contentSummary: AiOfficeContentSummaryView;
  profileMissing: boolean;
  goalMissing: boolean;
  settlementAttentionNeeded: boolean;
  avgProgressPct: number;
  hrefs: {
    aiOfficeOverview: string;
    aiOfficeInbox: string;
    aiOfficeInboxRole: (roleId: CreatorAiAgentRole) => string;
    aiOfficeCreateManager: string;
    aiOfficeCreatePromotion: string;
  };
}): CreatorReadyAiManagerCard[] {
  const cards: CreatorReadyAiManagerCard[] = [];
  const roleGuidance = getAiOfficeRoleGuidance(
    getAiOfficeRoleChoices(),
    args.usefulness.roleBreakdown
  );
  const latestDailyPlan = parseDailyActionPlanOutput(
    latestTaskOfType(args.tasks, "DAILY_ACTION_PLAN")?.output ?? null
  );
  const daysSincePublished = daysSince(args.contentSummary.lastPublishedAt);

  if (args.usefulness.waitingApprovalCount > 0) {
    pushCardIfMissing(cards, {
      id: "waiting-approval",
      tone: "attention",
      title: `承認待ちが ${args.usefulness.waitingApprovalCount.toString()} 件あります`,
      body:
        roleGuidance.roleId && roleGuidance.tone === "attention"
          ? roleGuidance.description
          : "提案が溜まると、AIの下書きが実務につながりにくくなります。まず Inbox を確認しましょう。",
      action: {
        kind: "href",
        label: "Inbox を開く",
        href:
          roleGuidance.roleId && roleGuidance.tone === "attention"
            ? args.hrefs.aiOfficeInboxRole(roleGuidance.roleId)
            : args.hrefs.aiOfficeInbox,
      },
      badge: "承認待ち",
    });
  }

  if (latestDailyPlan) {
    const topAction = latestDailyPlan.actions[0] ?? null;
    pushCardIfMissing(cards, {
      id: "latest-daily-plan",
      tone: "recommended",
      title: topAction?.title ?? "今日の行動計画があります",
      body: topAction?.reason ?? latestDailyPlan.summary,
      action: {
        kind: "href",
        label: "AI事務所で確認する",
        href: args.hrefs.aiOfficeOverview,
      },
      badge: getAgentTaskTypeCopy("DAILY_ACTION_PLAN").label,
    });
  }

  if (args.profileMissing || args.goalMissing) {
    pushCardIfMissing(cards, {
      id: "setup-support",
      tone: "recommended",
      title: args.profileMissing
        ? "プロフィール改善を先に進める"
        : "Goal と支援導線を整える",
      body: args.profileMissing
        ? "公開ページの印象を上げるには、紹介文と基本情報の整理が先に効きます。"
        : "支援理由と目標金額が見えると、Creator Home の提案が具体的になります。",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
      badge: "準備",
    });
  } else if (args.settlementAttentionNeeded) {
    pushCardIfMissing(cards, {
      id: "settlement-attention",
      tone: "attention",
      title: "達成後の整理を先に確認する",
      body:
        "達成済みまたは精算対象のプロジェクトがあります。配分準備やブリッジ状況を先に確認すると次の提案がぶれません。",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
      badge: "精算確認",
    });
  } else if (daysSincePublished === null || daysSincePublished >= 5) {
    pushCardIfMissing(cards, {
      id: "promotion-draft",
      tone: "recommended",
      title:
        daysSincePublished === null
          ? "最初の投稿下書きを作る"
          : `${daysSincePublished.toString()}日ぶりの発信を準備する`,
      body:
        daysSincePublished === null
          ? "AIに近況投稿や告知文のたたき台を作ってもらうと、最初の一歩を軽くできます。"
          : "投稿が空いているので、Promotion Agent で短い近況共有を作るのが効きます。",
      action: {
        kind: "href",
        label: "下書きを作る",
        href: args.hrefs.aiOfficeCreatePromotion,
      },
      badge: "発信",
    });
  } else {
    pushCardIfMissing(cards, {
      id: "manager-next-actions",
      tone: "neutral",
      title: "次の一手を Manager Agent に整理してもらう",
      body:
        args.avgProgressPct >= 70
          ? "達成が見えてきた段階なので、告知・報告・次の準備をまとめて整理する価値があります。"
          : "今の進捗なら、優先順位の整理と次の一手の言語化が効きます。",
      action: {
        kind: "href",
        label: "AI事務所を開く",
        href: args.hrefs.aiOfficeCreateManager,
      },
      badge: "次の一手",
    });
  }

  if (cards.length < 3 && roleGuidance.roleId && roleGuidance.tone !== "attention") {
    pushCardIfMissing(cards, {
      id: "role-guidance",
      tone: roleGuidance.tone === "recommended" ? "recommended" : "neutral",
      title: roleGuidance.title,
      body: roleGuidance.description,
      action: {
        kind: "href",
        label: "この担当を開く",
        href: args.hrefs.aiOfficeCreateManager,
      },
      badge: roleGuidance.roleId,
    });
  }

  return cards.slice(0, 3);
}

export function buildCreatorReadyTaskLists(args: {
  tasks: readonly AgentTaskView[];
  usefulness: AiOfficeUsefulnessSummaryView;
  contentSummary: AiOfficeContentSummaryView;
  profileMissing: boolean;
  goalMissing: boolean;
  settlementAttentionNeeded: boolean;
  avgProgressPct: number;
  hrefs: {
    aiOfficeOverview: string;
    aiOfficeInbox: string;
    aiOfficeCreateManager: string;
    aiOfficeCreatePromotion: string;
  };
}): {
  today: CreatorReadyTaskItem[];
  week: CreatorReadyTaskItem[];
} {
  const today: CreatorReadyTaskItem[] = [];
  const week: CreatorReadyTaskItem[] = [];
  const latestDailyPlan = parseDailyActionPlanOutput(
    latestTaskOfType(args.tasks, "DAILY_ACTION_PLAN")?.output ?? null
  );
  const daysSincePublished = daysSince(args.contentSummary.lastPublishedAt);

  if (latestDailyPlan) {
    for (const action of latestDailyPlan.actions.slice(0, 3)) {
      const mappedAction: CreatorReadyHomeAction =
        action.category === "goal"
          ? { kind: "settings", label: "設定・準備を開く" }
          : action.category === "posting"
            ? {
                kind: "href",
                label: "下書きを作る",
                href: args.hrefs.aiOfficeCreatePromotion,
              }
            : action.category === "approval"
              ? {
                  kind: "href",
                  label: "Inbox を開く",
                  href: args.hrefs.aiOfficeInbox,
                }
              : {
                  kind: "href",
                  label: "AI事務所を開く",
                  href: args.hrefs.aiOfficeOverview,
                };

      pushTaskIfMissing(today, {
        id: `daily-${action.id}`,
        title: action.title,
        body: action.reason,
        owner:
          action.category === "approval" || action.category === "next-step"
            ? "AI_OFFICE"
            : action.category === "goal"
              ? "SHARED"
              : "CREATOR",
        priority: action.priority,
        action: mappedAction,
      });
    }
  }

  if (today.length === 0 && args.usefulness.waitingApprovalCount > 0) {
    pushTaskIfMissing(today, {
      id: "today-approvals",
      title: `承認待ち ${args.usefulness.waitingApprovalCount.toString()} 件を確認する`,
      body: "AIの下書きを止めないために、まず Inbox で確認待ちを減らしましょう。",
      owner: "AI_OFFICE",
      priority: "high",
      action: {
        kind: "href",
        label: "Inbox を開く",
        href: args.hrefs.aiOfficeInbox,
      },
    });
  }

  if (today.length < 3 && (daysSincePublished === null || daysSincePublished >= 5)) {
    pushTaskIfMissing(today, {
      id: "today-posting",
      title:
        daysSincePublished === null
          ? "最初の投稿を準備する"
          : "短い近況投稿を 1 本準備する",
      body:
        daysSincePublished === null
          ? "活動の入口になる 1 本を用意しましょう。"
          : "継続感を戻すには、短くても今の動きが見える投稿が効きます。",
      owner: "CREATOR",
      priority: daysSincePublished === null ? "high" : "medium",
      action: {
        kind: "href",
        label: "下書きを作る",
        href: args.hrefs.aiOfficeCreatePromotion,
      },
    });
  }

  if (today.length < 3 && (args.profileMissing || args.goalMissing)) {
    pushTaskIfMissing(today, {
      id: "today-setup",
      title: args.profileMissing ? "プロフィールを整える" : "Goal を設定する",
      body: args.profileMissing
        ? "紹介文と基本情報を整えると、公開ページがぐっと伝わりやすくなります。"
        : "支援の理由と目標が見えるようにして、導線を完成させましょう。",
      owner: "SHARED",
      priority: "high",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
    });
  }

  if (args.profileMissing) {
    pushTaskIfMissing(week, {
      id: "week-profile",
      title: "プロフィールの見せ方を今週中に整える",
      body: "紹介文・アイコン・リンクが揃うと、AI提案と公開ページの精度が上がります。",
      owner: "CREATOR",
      priority: "high",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
    });
  }

  if (args.goalMissing) {
    pushTaskIfMissing(week, {
      id: "week-goal",
      title: "Goal と支援の使い道を言葉にする",
      body: "支援額だけでなく、何に使うかが伝わると次の支援につながりやすくなります。",
      owner: "SHARED",
      priority: "high",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
    });
  }

  if (args.settlementAttentionNeeded) {
    pushTaskIfMissing(week, {
      id: "week-settlement",
      title: "精算対象のプロジェクトを整理する",
      body: "達成後の配分準備やブリッジ状況を確認し、次の段取りを止めないようにします。",
      owner: "SHARED",
      priority: "high",
      action: {
        kind: "settings",
        label: "設定・準備を開く",
      },
    });
  }

  if (!args.profileMissing && !args.goalMissing && !args.settlementAttentionNeeded) {
    pushTaskIfMissing(week, {
      id: "week-ai-review",
      title: "AI事務所の提案を 1 件実務につなげる",
      body:
        args.usefulness.usedCount > 0
          ? "すでに使えている流れがあるので、もう 1 件つなげると運営の型になります。"
          : "提案を見るだけで終わらせず、実際の投稿や準備に 1 件つなげてみましょう。",
      owner: "AI_OFFICE",
      priority: "medium",
      action: {
        kind: "href",
        label: "AI事務所を開く",
        href: args.hrefs.aiOfficeOverview,
      },
    });
  }

  if (args.avgProgressPct > 0 && args.avgProgressPct < 100) {
    pushTaskIfMissing(week, {
      id: "week-progress-share",
      title: "進捗を伝える投稿か報告を 1 回入れる",
      body: "進捗の意味と次の一手を一緒に伝えると、支援の流れが続きやすくなります。",
      owner: "CREATOR",
      priority: "medium",
      action: {
        kind: "href",
        label: "下書きを作る",
        href: args.hrefs.aiOfficeCreatePromotion,
      },
    });
  }

  if (daysSincePublished !== null && daysSincePublished <= 4) {
    pushTaskIfMissing(week, {
      id: "week-follow-up",
      title: "最新の発信の次につながる動きを決める",
      body: "投稿後に、告知・お礼・次の計画のどれを重ねるか先に決めておくと継続しやすくなります。",
      owner: "AI_OFFICE",
      priority: "low",
      action: {
        kind: "href",
        label: "AI事務所を開く",
        href: args.hrefs.aiOfficeCreateManager,
      },
    });
  }

  return {
    today: sortTaskItems(today).slice(0, 4),
    week: sortTaskItems(week).slice(0, 4),
  };
}
