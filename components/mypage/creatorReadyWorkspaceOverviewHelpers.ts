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
      title: "承認待ちを先に片づける",
      body: "公開前に確認が必要な下書きがあります。まず承認待ちを処理すると、日々の運営が止まりません。",
      actionLabel: "下書きと承認を開く",
      onAction: params.onOpenSupporterResponse,
    });
  } else if (missingProject) {
    actions.push({
      title: "最初のプロフィールと支援設定を準備する",
      body: "支援を受ける通貨を決めて、まずは project と公開情報の土台を作ります。",
      actionLabel: "プロフィールと支援設定を開く",
      onAction: params.onOpenSupportPage,
    });
  } else if (missingGoal) {
    actions.push({
      title: "目標金額を設定する",
      body: "何を目指しているかが伝わるように、goal を先に固めます。",
      actionLabel: "プロフィールと支援設定を開く",
      onAction: params.onOpenSupportPage,
    });
  } else {
    actions.push({
      title: "今週の告知やお礼を進める",
      body: "今の支援状況を見ながら、支援者向けの下書きと告知を更新する段階です。",
      actionLabel: "下書きと承認を開く",
      onAction: params.onOpenSupporterResponse,
    });
  }

  actions.push({
    title: "プロフィールと支援設定を見直す",
    body: "プロフィール、goal、公開情報が今の活動内容とずれていないか確認します。",
    actionLabel: "プロフィールと支援設定を開く",
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
      title: "metrics と拡張下書き",
      body: "承認待ちの確認を優先したうえで、metrics や拡張ドラフトを使って次の運営を広げる枠です。",
      actionLabel: "下書きと承認を開く",
      onAction: params.onOpenSupporterResponse,
    },
    {
      title: "精算と高リスク設定",
      body: "配分、gas support、bridge / CCTP のような判断コストが高い操作は日常導線と分けて扱います。",
      actionLabel: "精算と詳細設定を開く",
      onAction: params.onOpenAdvancedSettings,
    },
  ];
}
