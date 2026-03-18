import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

export type CreatorReadyQuickAction = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
};

export type CreatorReadyBetaWorkspaceAction = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
};

export type HomeTaskPreview = {
  id: string;
  taskType: string;
};

export type ActiveProjectDashboard = MyPageProjectDashboard & {
  summary: NonNullable<MyPageProjectDashboard["summary"]>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function parseCreatorReadyWaitingTasks(
  json: unknown
): HomeTaskPreview[] {
  if (!isRecord(json)) return [];
  const tasks = asArray(json.tasks);
  const parsed: HomeTaskPreview[] = [];

  for (const task of tasks) {
    if (!isRecord(task)) continue;
    const id = asStringOrNull(task.id);
    const taskType = asStringOrNull(task.taskType);
    const status = asStringOrNull(task.status);
    if (!id || !taskType || status !== "WAITING_APPROVAL") continue;
    parsed.push({ id, taskType });
  }

  return parsed;
}

export function hasCreatorReadySettlementAttention(
  activeDashboards: ActiveProjectDashboard[]
): boolean {
  return activeDashboards.some((dashboard) => {
    const status = dashboard.settlement?.settlement.status;
    return (
      Boolean(dashboard.summary.goal?.achievedAt) ||
      status === "BRIDGING" ||
      status === "READY_FOR_DISTRIBUTION"
    );
  });
}

export function buildCreatorReadyQuickActions(params: {
  activeDashboards: ActiveProjectDashboard[];
  waitingApprovalCount: number;
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
}): CreatorReadyQuickAction[] {
  const missingProject = params.activeDashboards.length === 0;
  const missingGoal = params.activeDashboards.some(
    (dashboard) => !dashboard.summary.goal
  );

  const actions: CreatorReadyQuickAction[] = [];

  if (params.waitingApprovalCount > 0) {
    actions.push({
      title: "AIの承認待ちを確認する",
      body: "確認が必要な提案や下書きがあります。承認すると日々の運営がスムーズに進みます。",
      actionLabel: "提案を確認する",
      onAction: params.onOpenSupporterResponse,
    });
  } else if (missingProject) {
    actions.push({
      title: "プロフィールと支援設定を準備する",
      body: "支援を受ける通貨を決めて、プロフィールと公開情報の土台を作ります。",
      actionLabel: "プロフィール・支援設定を開く",
      onAction: params.onOpenSupportPage,
    });
  } else if (missingGoal) {
    actions.push({
      title: "目標金額を設定する",
      body: "何を目指しているかが支援者に伝わるよう、目標金額を設定します。",
      actionLabel: "プロフィール・支援設定を開く",
      onAction: params.onOpenSupportPage,
    });
  } else {
    actions.push({
      title: "告知やお礼の下書きを進める",
      body: "支援者向けの告知・お礼をAIと一緒に準備できます。",
      actionLabel: "AIの提案を確認する",
      onAction: params.onOpenSupporterResponse,
    });
  }

  actions.push({
    title: "プロフィールと支援設定を見直す",
    body: "プロフィール・目標金額・公開情報が現在の活動内容と合っているか確認します。",
    actionLabel: "プロフィール・支援設定を開く",
    onAction: params.onOpenSupportPage,
  });

  actions.push({
    title: "公開ページを支援者目線で確認する",
    body: "支援前に見える情報とリンクが最新かをすぐ確認できます。",
    actionLabel: "公開ページを確認する",
    onAction: params.onOpenPublicPage,
  });

  return actions;
}

export function buildCreatorReadyBetaActions(params: {
  onOpenSupporterResponse: () => void;
  onOpenAdvancedSettings: () => void;
}): CreatorReadyBetaWorkspaceAction[] {
  return [
    {
      title: "分析・拡張機能",
      body: "支援状況の分析や、高度な下書き機能を試せます（試験提供中）。",
      actionLabel: "AIの提案を確認する",
      onAction: params.onOpenSupporterResponse,
    },
    {
      title: "精算・送金設定",
      body: "目標達成後の配分・精算・ブリッジなど、高度な操作をまとめています。",
      actionLabel: "精算・詳細設定を開く",
      onAction: params.onOpenAdvancedSettings,
    },
  ];
}
