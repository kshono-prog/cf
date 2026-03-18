import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import { isRecord } from "@/lib/mypage/helpers";

export type DistributionPlanDraftRow = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: CurrencyCode;
};

export type DistributionPlanDraftPayload = {
  version: 1;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  currency: CurrencyCode;
  generatedAt: string;
  source:
    | "existing_distribution_entries"
    | "saved_distribution_plan"
    | "bridged_total_template"
    | "blank_template";
  summary: {
    goalAchieved: boolean;
    progressPct: number | null;
    settlementStatus: string | null;
    bridgedTotalAtomic: string;
  };
  rows: DistributionPlanDraftRow[];
  notes: string[];
};

export type DistributionPlanDraftContext = {
  project: {
    id: string;
    title: string;
    status: string;
    currency: CurrencyCode;
  };
  goal: {
    achievedAt: string | null;
  } | null;
  progress: {
    progressPct: number;
  } | null;
  distributionPlan: unknown;
  settlement: {
    status: string | null;
    bridgedTotalAtomic: string | null;
  };
  distributionEntries: Array<{
    id?: string;
    recipientAddressChecksum: string;
    amountAtomic: string;
    memo: string | null;
    status: string;
    token: CurrencyCode;
  }>;
  generatedAt?: string;
};

export type ParsedDistributionPlanDraftResult =
  | { ok: true; rows: DistributionPlanDraftRow[] }
  | { ok: false; error: "AI_DRAFT_EMPTY" | "AI_DRAFT_INVALID_JSON" | "AI_DRAFT_ROWS_REQUIRED" };

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAtomicString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : "";
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return String(value);
  }

  return "";
}

function toCurrencyCode(value: unknown): CurrencyCode | null {
  return value === "JPYC" || value === "USDC" ? value : null;
}

function isPositiveAtomic(value: string | null): boolean {
  return typeof value === "string" && /^\d+$/.test(value) && value !== "0";
}

function hasMeaningfulRow(row: DistributionPlanDraftRow): boolean {
  return (
    row.recipientAddress.trim().length > 0 ||
    row.amountAtomic.trim().length > 0 ||
    row.memo.trim().length > 0
  );
}

function buildRowFromUnknown(
  value: unknown,
  fallbackToken: CurrencyCode
): DistributionPlanDraftRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const recipientAddress =
    toTrimmedString(value.recipientAddress) ??
    toTrimmedString(value.recipientAddressChecksum) ??
    toTrimmedString(value.address) ??
    toTrimmedString(value.to) ??
    "";
  const amountAtomic =
    toAtomicString(value.amountAtomic) ||
    toAtomicString(value.amount) ||
    toAtomicString(value.value);
  const memo =
    toTrimmedString(value.memo) ??
    toTrimmedString(value.note) ??
    toTrimmedString(value.label) ??
    "";
  const token =
    toCurrencyCode(value.token) ??
    toCurrencyCode(value.currency) ??
    fallbackToken;
  const id = toTrimmedString(value.id) ?? undefined;

  const row: DistributionPlanDraftRow = {
    ...(id ? { id } : {}),
    recipientAddress,
    amountAtomic,
    memo,
    token,
  };

  return hasMeaningfulRow(row) ? row : null;
}

function extractRowsFromUnknownPlan(
  value: unknown,
  fallbackToken: CurrencyCode
): DistributionPlanDraftRow[] | null {
  const candidates: unknown[] | null = (() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (!isRecord(value)) {
      return null;
    }

    const rows = value.rows;
    if (Array.isArray(rows)) {
      return rows;
    }

    const entries = value.entries;
    if (Array.isArray(entries)) {
      return entries;
    }

    const recipients = value.recipients;
    if (Array.isArray(recipients)) {
      return recipients;
    }

    return null;
  })();

  if (!candidates) {
    return null;
  }

  const rows = candidates
    .map((item) => buildRowFromUnknown(item, fallbackToken))
    .filter((item): item is DistributionPlanDraftRow => item !== null)
    .map((row) => ({
      ...row,
      token: fallbackToken,
    }));

  return rows.length > 0 ? rows : null;
}

function buildRowsFromEntries(
  entries: DistributionPlanDraftContext["distributionEntries"],
  token: CurrencyCode
): DistributionPlanDraftRow[] {
  return entries
    .filter((entry) => entry.status !== "SENT" && entry.status !== "CANCELLED")
    .map((entry) => ({
      ...(entry.id ? { id: entry.id } : {}),
      recipientAddress: entry.recipientAddressChecksum,
      amountAtomic: entry.amountAtomic,
      memo: entry.memo ?? "",
      token,
    }))
    .filter(hasMeaningfulRow);
}

function buildFallbackRow(
  context: DistributionPlanDraftContext
): DistributionPlanDraftRow {
  const bridgedTotalAtomic = isPositiveAtomic(context.settlement.bridgedTotalAtomic)
    ? context.settlement.bridgedTotalAtomic ?? ""
    : "";

  return {
    recipientAddress: "",
    amountAtomic: bridgedTotalAtomic,
    memo: `${context.project.title} の配分案`,
    token: context.project.currency,
  };
}

function buildNotes(args: {
  source: DistributionPlanDraftPayload["source"];
  rows: readonly DistributionPlanDraftRow[];
  context: DistributionPlanDraftContext;
}): string[] {
  const notes: string[] = [];

  if (args.source === "existing_distribution_entries") {
    notes.push("保存済みの配分行をもとに、見直しや再保存しやすい draft を再構成しました。");
  } else if (args.source === "saved_distribution_plan") {
    notes.push("既存の distribution plan JSON をもとに、編集しやすい draft を再構成しました。");
  } else if (args.source === "bridged_total_template") {
    notes.push("Bridge 済み total を 1 行の仮置きにしています。recipientAddress を確認してから保存してください。");
  } else {
    notes.push("利用できる plan source がまだないため、空欄を含む template を作成しました。");
  }

  if (!args.context.goal?.achievedAt) {
    notes.push("goal はまだ未達成または未確定です。この draft は準備用として確認してください。");
  }

  if (!isPositiveAtomic(args.context.settlement.bridgedTotalAtomic)) {
    notes.push("Bridge 済み total がまだないため、amountAtomic は空欄または参考値のままです。");
  }

  if (args.rows.some((row) => row.recipientAddress.trim().length === 0)) {
    notes.push("recipientAddress が空欄の行があります。保存前に入力してください。");
  }

  if (args.rows.some((row) => row.amountAtomic.trim().length === 0)) {
    notes.push("amountAtomic が空欄の行があります。保存前に確認してください。");
  }

  return notes;
}

export function buildDistributionPlanDraftPayload(
  context: DistributionPlanDraftContext
): DistributionPlanDraftPayload {
  const rowsFromEntries = buildRowsFromEntries(
    context.distributionEntries,
    context.project.currency
  );
  const rowsFromSavedPlan = extractRowsFromUnknownPlan(
    context.distributionPlan,
    context.project.currency
  );

  const source: DistributionPlanDraftPayload["source"] =
    rowsFromEntries.length > 0
      ? "existing_distribution_entries"
      : rowsFromSavedPlan
        ? "saved_distribution_plan"
        : isPositiveAtomic(context.settlement.bridgedTotalAtomic)
          ? "bridged_total_template"
          : "blank_template";

  const rows =
    rowsFromEntries.length > 0
      ? rowsFromEntries
      : rowsFromSavedPlan && rowsFromSavedPlan.length > 0
        ? rowsFromSavedPlan
        : [buildFallbackRow(context)];

  return {
    version: 1,
    projectId: context.project.id,
    projectTitle: context.project.title,
    projectStatus: context.project.status,
    currency: context.project.currency,
    generatedAt: context.generatedAt ?? new Date().toISOString(),
    source,
    summary: {
      goalAchieved: context.goal?.achievedAt != null,
      progressPct:
        typeof context.progress?.progressPct === "number"
          ? context.progress.progressPct
          : null,
      settlementStatus: context.settlement.status,
      bridgedTotalAtomic: context.settlement.bridgedTotalAtomic ?? "0",
    },
    rows,
    notes: buildNotes({
      source,
      rows,
      context,
    }),
  };
}

export function formatDistributionPlanDraftPayload(
  payload: DistributionPlanDraftPayload
): string {
  return JSON.stringify(payload, null, 2);
}

export function parseDistributionPlanDraftText(
  text: string,
  fallbackToken: CurrencyCode
): ParsedDistributionPlanDraftResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "AI_DRAFT_EMPTY" };
  }

  try {
    const value: unknown = JSON.parse(trimmed);
    const rows = extractRowsFromUnknownPlan(value, fallbackToken);
    if (!rows || rows.length === 0) {
      return { ok: false, error: "AI_DRAFT_ROWS_REQUIRED" };
    }

    return {
      ok: true,
      rows: rows.map((row) => ({
        ...row,
        token: fallbackToken,
      })),
    };
  } catch {
    return { ok: false, error: "AI_DRAFT_INVALID_JSON" };
  }
}
