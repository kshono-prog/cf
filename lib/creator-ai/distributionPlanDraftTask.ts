import { isRecord, toNonEmptyString } from "@/lib/api/guards";
import {
  buildDistributionPlanDraftPayload,
  type DistributionPlanDraftMember,
  type DistributionPlanDraftPayload,
} from "@/lib/creator-ai/distributionPlanDraft";
import type { CurrencyCode, SummaryViewData } from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

export type DistributionPlanDraftTaskInput = {
  source: string;
  requestedAt: string;
};

export type DistributionPlanDraftTaskProjectSnapshot = {
  projectId: string;
  title: string;
  status: string;
  currency: CurrencyCode;
  goalAchieved: boolean;
  settlementStatus: ProjectSettlementData["settlement"]["status"] | null;
  bridgedTotalAtomic: string;
  distributionEntryCount: number;
};

export type DistributionPlanDraftTaskOutput = {
  summary: string;
  draftPayload?: DistributionPlanDraftPayload;
  projectSnapshot?: DistributionPlanDraftTaskProjectSnapshot;
  basedOn: DistributionPlanDraftTaskInput;
};

function defaultRequestedAt(nowIso: string): string {
  return nowIso;
}

export function normalizeDistributionPlanDraftTaskInput(
  input: unknown,
  nowIso: string = new Date().toISOString()
): DistributionPlanDraftTaskInput | null {
  if (input == null) {
    return {
      source: "mypage",
      requestedAt: defaultRequestedAt(nowIso),
    };
  }

  if (Array.isArray(input) || !isRecord(input)) {
    return null;
  }

  return {
    source: toNonEmptyString(input.source) ?? "mypage",
    requestedAt:
      toNonEmptyString(input.requestedAt) ?? defaultRequestedAt(nowIso),
  };
}

function resolveCurrency(args: {
  summary: SummaryViewData | null;
  settlement: ProjectSettlementData | null;
}): CurrencyCode {
  const summaryCurrency = args.summary?.project.currency;
  if (summaryCurrency === "JPYC" || summaryCurrency === "USDC") {
    return summaryCurrency;
  }

  const settlementToken =
    args.settlement?.distributionEntries[0]?.token ??
    args.settlement?.bridgeSteps[0]?.token;

  return settlementToken === "USDC" ? "USDC" : "JPYC";
}

function buildDraftContext(args: {
  summary: SummaryViewData | null;
  settlement: ProjectSettlementData | null;
}) {
  const projectId = args.summary?.project.id ?? args.settlement?.project.id ?? null;
  const title = args.summary?.project.title ?? args.settlement?.project.title ?? null;
  const status =
    args.summary?.project.status ?? args.settlement?.project.status ?? null;

  if (!projectId || !title || !status) {
    return null;
  }

  return {
    project: {
      id: projectId,
      title,
      status,
      currency: resolveCurrency(args),
    },
    goal: args.summary?.goal ?? (args.settlement?.goal ? { achievedAt: args.settlement.goal.achievedAt } : null),
    progress: args.summary
      ? {
          progressPct: args.summary.progress.progressPct,
        }
      : null,
    distributionPlan: args.summary?.distributionPlan ?? null,
    settlement: {
      status: args.settlement?.settlement.status ?? null,
      bridgedTotalAtomic: args.settlement?.settlement.bridgedTotalAtomic ?? null,
    },
    distributionEntries:
      args.settlement?.distributionEntries.map((entry) => ({
        id: entry.id,
        recipientAddressChecksum: entry.recipientAddressChecksum,
        amountAtomic: entry.amountAtomic,
        memo: entry.memo,
        status: entry.status,
        token: entry.token,
      })) ?? [],
  };
}

function buildProjectSnapshot(args: {
  payload: DistributionPlanDraftPayload;
  settlement: ProjectSettlementData | null;
}): DistributionPlanDraftTaskProjectSnapshot {
  return {
    projectId: args.payload.projectId,
    title: args.payload.projectTitle,
    status: args.payload.projectStatus,
    currency: args.payload.currency,
    goalAchieved: args.payload.summary.goalAchieved,
    settlementStatus: args.settlement?.settlement.status ?? null,
    bridgedTotalAtomic: args.payload.summary.bridgedTotalAtomic,
    distributionEntryCount: args.settlement?.distributionEntries.length ?? 0,
  };
}

function buildOutputSummary(
  payload: DistributionPlanDraftPayload | null
): string {
  if (!payload) {
    return "Finance Agent は project 情報が不足しているため、配分 plan の下書きをまだ作成できませんでした。";
  }

  const sourceText =
    payload.source === "existing_distribution_entries"
      ? "既存の配分行"
      : payload.source === "saved_distribution_plan"
        ? "保存済み plan"
        : payload.source === "member_share_template"
          ? "メンバーのシェア比率"
          : payload.source === "bridged_total_template"
            ? "Bridge 済み total"
            : "空の template";

  return `Finance Agent が ${sourceText} をもとに、配分 plan の下書きを ${payload.rows.length} 行で整理しました。Draft step で確認してから手動保存してください。`;
}

export function buildDistributionPlanDraftTaskOutput(args: {
  summary: SummaryViewData | null;
  settlement: ProjectSettlementData | null;
  input: DistributionPlanDraftTaskInput;
  projectMembers?: DistributionPlanDraftMember[];
}): DistributionPlanDraftTaskOutput {
  const context = buildDraftContext(args);
  const draftPayload = context
    ? buildDistributionPlanDraftPayload({ ...context, projectMembers: args.projectMembers })
    : null;

  return {
    summary: buildOutputSummary(draftPayload),
    ...(draftPayload
      ? {
          draftPayload,
          projectSnapshot: buildProjectSnapshot({
            payload: draftPayload,
            settlement: args.settlement,
          }),
        }
      : {}),
    basedOn: args.input,
  };
}
