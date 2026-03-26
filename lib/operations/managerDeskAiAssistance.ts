import type {
  ManagerDeskCreatorDetailData,
  ManagerDeskDashboardCard,
  ManagerDeskDashboardData,
} from "@/lib/managerDesk/readModelTypes";
import type { PlannerTimelineItem } from "@/lib/operations/plannerTypes";

export type ManagerDeskAiSuggestionTone = "attention" | "info";

export type ManagerDeskAiSuggestion = {
  id: string;
  title: string;
  reason: string;
  recommendation: string;
  dueAt: string | null;
  tone: ManagerDeskAiSuggestionTone;
  sourceLabel: string;
  href: string;
  actionLabel: string;
};

type DueState = "OVERDUE" | "DUE_SOON" | "NONE";

const THREE_DAYS_MS = 1000 * 60 * 60 * 24 * 3;

function getDueState(value: string | null, now: Date): DueState {
  if (!value) return "NONE";
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) return "NONE";
  if (dueAt.getTime() < now.getTime()) return "OVERDUE";
  if (dueAt.getTime() - now.getTime() <= THREE_DAYS_MS) return "DUE_SOON";
  return "NONE";
}

function toneFromDueState(dueState: DueState): ManagerDeskAiSuggestionTone {
  return dueState === "NONE" ? "info" : "attention";
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}…`;
}

function creatorName(card: ManagerDeskDashboardCard): string {
  return card.creator.displayName || card.creator.username;
}

function buildDashboardCardSuggestion(
  card: ManagerDeskDashboardCard,
  now: Date
): ManagerDeskAiSuggestion | null {
  const detailHref = `/manager-desk/creators/${card.creator.id}`;
  const displayName = creatorName(card);

  if (card.latestManagerNote?.followUpNeeded) {
    const dueState = getDueState(card.latestManagerNote.followUpDueAt, now);
    return {
      id: `dashboard-note-${card.assignment.id}`,
      title: `${displayName} の follow-up を先に確認する`,
      reason:
        card.latestManagerNote.aiSummary ??
        truncate(card.latestManagerNote.body, 90),
      recommendation:
        dueState === "OVERDUE"
          ? "期限を超えているため、関連 note と planner を確認して次の連絡か会議準備を決める"
          : "関連 note の文脈を確認して、次の会議か対外フォローへつなげる",
      dueAt: card.latestManagerNote.followUpDueAt,
      tone: toneFromDueState(dueState),
      sourceLabel: "Manager Note",
      href: `${detailHref}#next-actions`,
      actionLabel: "Next Actions を開く",
    };
  }

  if (card.nextContact?.nextAction) {
    const dueState = getDueState(card.nextContact.nextActionDueAt, now);
    return {
      id: `dashboard-contact-${card.assignment.id}`,
      title: `${displayName} の対外フォローを確認する`,
      reason: `${card.nextContact.organizationName}: ${card.nextContact.nextAction}`,
      recommendation:
        dueState === "OVERDUE"
          ? "期限超過の接点です。温度感と最終接触日を確認して、再連絡の要否を判断する"
          : "対外先の温度感と次アクション期限を見て、先回りして準備する",
      dueAt: card.nextContact.nextActionDueAt,
      tone: toneFromDueState(dueState),
      sourceLabel: "External Contact",
      href: `${detailHref}#key-contacts`,
      actionLabel: "Key Contacts を開く",
    };
  }

  if (
    card.activeProject &&
    card.activeProject.achievedAt == null &&
    card.activeProject.deadline
  ) {
    const dueState = getDueState(card.activeProject.deadline, now);
    return {
      id: `dashboard-project-${card.assignment.id}`,
      title: `${displayName} の Project 期限を確認する`,
      reason: `${card.activeProject.title} は ${card.activeProject.progressPct.toFixed(
        0
      )}% 進行しています。`,
      recommendation:
        "goal 進捗と告知導線を確認して、会議で何を決めるかを先に整理する",
      dueAt: card.activeProject.deadline,
      tone: toneFromDueState(dueState),
      sourceLabel: "Project",
      href: `${detailHref}#project-goal`,
      actionLabel: "Project / Goal を開く",
    };
  }

  if (card.staleDays != null && card.staleDays >= 5) {
    return {
      id: `dashboard-stale-${card.assignment.id}`,
      title: `${displayName} の停滞理由を確認する`,
      reason:
        card.priority.reasons[0] ??
        `${card.staleDays} 日ほど大きな更新がありません。`,
      recommendation:
        "直近の note と action log を見て、再起動のための会議論点を 1 つ決める",
      dueAt: null,
      tone: "attention",
      sourceLabel: "Stale Signal",
      href: `${detailHref}#recent-action-log`,
      actionLabel: "Recent Action Log を開く",
    };
  }

  if (card.priority.reasons.length === 0) return null;

  return {
    id: `dashboard-summary-${card.assignment.id}`,
    title: `${displayName} の優先理由を確認する`,
    reason: card.priority.reasons[0],
    recommendation:
      "Creator Detail を開き、Project / note / contact のどこから着手するかを決める",
    dueAt: card.latestActionAt,
    tone: card.priority.level === "HIGH" ? "attention" : "info",
    sourceLabel: "Priority",
    href: detailHref,
    actionLabel: "Creator Detail を開く",
  };
}

function plannerRecommendation(item: PlannerTimelineItem): {
  recommendation: string;
  sourceLabel: string;
  href: string;
  actionLabel: string;
} {
  switch (item.sourceType) {
    case "MEETING":
      return {
        recommendation:
          "会議の論点と次アクション候補を先に確認して、決定事項を増やせる状態にする",
        sourceLabel: "Meeting",
        href: "#planner",
        actionLabel: "Planner を見る",
      };
    case "MANAGER_NOTE_FOLLOW_UP":
      return {
        recommendation:
          "関連 note の文脈と担当境界を確認して、次の確認先を決める",
        sourceLabel: "Manager Note",
        href: "#latest-notes",
        actionLabel: "Latest Notes を見る",
      };
    case "EXTERNAL_CONTACT_NEXT_ACTION":
      return {
        recommendation:
          "対外先の温度感と next action を合わせて見て、連絡文面か会議論点を用意する",
        sourceLabel: "External Contact",
        href: "#key-contacts",
        actionLabel: "Key Contacts を見る",
      };
    case "PROJECT_DEADLINE":
      return {
        recommendation:
          "goal 進捗、期限、支援導線を見て、会議で何を判断するかを先に絞る",
        sourceLabel: "Project",
        href: "#project-goal",
        actionLabel: "Project / Goal を見る",
      };
  }
}

export function buildManagerDeskDashboardAiSummary(
  data: ManagerDeskDashboardData
): string {
  const parts: string[] = [];
  if (data.summary.highPriorityCount > 0) {
    parts.push(`高優先度の Creator が ${data.summary.highPriorityCount} 人います。`);
  }
  if (data.summary.followUpCreatorCount > 0) {
    parts.push(
      `Manager follow-up が残る Creator は ${data.summary.followUpCreatorCount} 人です。`
    );
  }
  if (data.summary.contactActionCreatorCount > 0) {
    parts.push(
      `対外接点の次アクションがある Creator は ${data.summary.contactActionCreatorCount} 人です。`
    );
  }
  if (parts.length === 0) {
    return "大きなアラートはまだありません。priority 順の一覧から、次に動く Creator を選べます。";
  }
  return parts.slice(0, 2).join(" ");
}

export function buildManagerDeskDashboardAiSuggestions(
  data: ManagerDeskDashboardData
): ManagerDeskAiSuggestion[] {
  const now = new Date(data.generatedAt);
  return data.cards
    .slice(0, 4)
    .map((card) => buildDashboardCardSuggestion(card, now))
    .filter((value): value is ManagerDeskAiSuggestion => value !== null);
}

export function buildManagerDeskCreatorDetailAiSummary(
  data: ManagerDeskCreatorDetailData
): string {
  const creatorName = data.creator.displayName || data.creator.username;
  const parts: string[] = [];
  if (data.activeProject) {
    parts.push(
      `${creatorName} は ${data.activeProject.title} を進めており、進捗は ${data.activeProject.progressPct.toFixed(
        0
      )}% です。`
    );
  }
  if (data.summary.followUpNoteCount > 0) {
    parts.push(`follow-up note が ${data.summary.followUpNoteCount} 件あります。`);
  }
  if (data.summary.contactActionCount > 0) {
    parts.push(`対外 next action が ${data.summary.contactActionCount} 件あります。`);
  }
  if (parts.length === 0) {
    return "大きな停滞は見えていません。planner と recent action を見ながら、次の会議論点を選べます。";
  }
  return parts.slice(0, 3).join(" ");
}

export function buildManagerDeskCreatorDetailAiSuggestions(
  data: ManagerDeskCreatorDetailData
): ManagerDeskAiSuggestion[] {
  return data.planner.items.slice(0, 4).map((item) => {
    const plan = plannerRecommendation(item);
    return {
      id: `detail-${item.id}`,
      title: item.title,
      reason: truncate(item.description, 120),
      recommendation: plan.recommendation,
      dueAt: item.dueAt,
      tone: item.status === "UPCOMING" ? "info" : "attention",
      sourceLabel: plan.sourceLabel,
      href: plan.href,
      actionLabel: plan.actionLabel,
    };
  });
}
