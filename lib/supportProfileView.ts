import type { SummaryViewData, CurrencyCode } from "@/lib/mypage/accountPageTypes";
import {
  resolveConfirmedAmount,
  resolveGoalTargetAmount,
} from "@/lib/fundingAmounts";
import type { CreatorProfile } from "@/types/creator";

export type SupportProjectStatus = "OPEN" | "ACHIEVED" | "NO_GOAL";

export type SupportProjectView = {
  projectId: string;
  currency: CurrencyCode;
  title: string;
  description: string | null;
  targetAmount: number | null;
  confirmedAmount: number;
  progressPct: number;
  status: SupportProjectStatus;
  achievedAt: string | null;
  deadline: string | null;
};

export type SupportProfileView = {
  mode: "ready" | "draft" | "unavailable";
  activeCurrency: CurrencyCode | null;
  activeProjectId: string | null;
  projectsByCurrency: {
    JPYC: SupportProjectView | null;
    USDC: SupportProjectView | null;
  };
  draft: {
    title: string | null;
    description: string | null;
  } | null;
};

type BuildSupportProfileViewArgs = {
  creator: Pick<CreatorProfile, "displayName" | "profile">;
  activeProjectId: string | null;
  projectIdsByCurrency: {
    JPYC: string | null;
    USDC: string | null;
  };
  summariesByCurrency: {
    JPYC: SummaryViewData | null;
    USDC: SummaryViewData | null;
  };
  activeSummary?: SummaryViewData | null;
};

function normalizeProgressPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function inferStatus(args: {
  targetAmount: number | null;
  achievedAt: string | null;
}): SupportProjectStatus {
  if (args.achievedAt) return "ACHIEVED";
  if (typeof args.targetAmount === "number" && Number.isFinite(args.targetAmount)) {
    return "OPEN";
  }
  return "NO_GOAL";
}

export function buildSupportProjectView(args: {
  projectId: string;
  currency: CurrencyCode;
  title: string;
  description: string | null;
  targetAmount: number | null;
  confirmedAmount: number;
  progressPct: number;
  achievedAt: string | null;
  deadline: string | null;
}): SupportProjectView {
  return {
    projectId: args.projectId,
    currency: args.currency,
    title: args.title,
    description: args.description,
    targetAmount:
      typeof args.targetAmount === "number" && Number.isFinite(args.targetAmount)
        ? args.targetAmount
        : null,
    confirmedAmount:
      typeof args.confirmedAmount === "number" && Number.isFinite(args.confirmedAmount)
        ? args.confirmedAmount
        : 0,
    progressPct: normalizeProgressPct(args.progressPct),
    status: inferStatus({
      targetAmount:
        typeof args.targetAmount === "number" && Number.isFinite(args.targetAmount)
          ? args.targetAmount
          : null,
      achievedAt: args.achievedAt,
    }),
    achievedAt: args.achievedAt,
    deadline: args.deadline,
  };
}

export function buildSupportProjectViewFromSummary(
  summary: SummaryViewData
): SupportProjectView | null {
  const currency = summary.project.currency;
  if (currency !== "JPYC" && currency !== "USDC") return null;

  return buildSupportProjectView({
    projectId: summary.project.id,
    currency,
    title: summary.project.title,
    description: summary.project.description,
    targetAmount: resolveGoalTargetAmount(summary.goal),
    confirmedAmount: resolveConfirmedAmount(summary.progress),
    progressPct: summary.progress.progressPct,
    achievedAt: summary.goal?.achievedAt ?? null,
    deadline: summary.goal?.deadline ?? null,
  });
}

export function buildSupportProfileView(
  args: BuildSupportProfileViewArgs
): SupportProfileView {
  const projectsByCurrency: SupportProfileView["projectsByCurrency"] = {
    JPYC: args.summariesByCurrency.JPYC
      ? buildSupportProjectViewFromSummary(args.summariesByCurrency.JPYC)
      : null,
    USDC: args.summariesByCurrency.USDC
      ? buildSupportProjectViewFromSummary(args.summariesByCurrency.USDC)
      : null,
  };

  if (args.activeSummary) {
    const activeView = buildSupportProjectViewFromSummary(args.activeSummary);
    if (activeView) {
      projectsByCurrency[activeView.currency] = activeView;
    }
  }

  const readyCurrencies = (["JPYC", "USDC"] as const).filter(
    (currency) => projectsByCurrency[currency] !== null
  );

  if (readyCurrencies.length > 0) {
    const activeCurrency =
      (["JPYC", "USDC"] as const).find(
        (currency) =>
          projectsByCurrency[currency]?.projectId === args.activeProjectId
      ) ??
      readyCurrencies[0];

    return {
      mode: "ready",
      activeCurrency,
      activeProjectId: projectsByCurrency[activeCurrency]?.projectId ?? null,
      projectsByCurrency,
      draft: null,
    };
  }

  const hasDraftSource =
    !args.activeProjectId &&
    !args.projectIdsByCurrency.JPYC &&
    !args.projectIdsByCurrency.USDC &&
    (typeof args.creator.displayName === "string" ||
      typeof args.creator.profile === "string");

  if (hasDraftSource) {
    const draftTitle = args.creator.displayName
      ? `${args.creator.displayName}の公開ページは準備中です`
      : null;

    return {
      mode: "draft",
      activeCurrency: null,
      activeProjectId: null,
      projectsByCurrency,
      draft: {
        title: draftTitle,
        description: args.creator.profile ?? null,
      },
    };
  }

  return {
    mode: "unavailable",
    activeCurrency: null,
    activeProjectId: null,
    projectsByCurrency,
    draft: null,
  };
}

export function getActiveSupportProject(
  view: SupportProfileView
): SupportProjectView | null {
  if (view.mode !== "ready") return null;
  if (view.activeCurrency) {
    return view.projectsByCurrency[view.activeCurrency];
  }
  return view.projectsByCurrency.JPYC ?? view.projectsByCurrency.USDC ?? null;
}
