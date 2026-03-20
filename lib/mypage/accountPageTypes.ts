export type CurrencyCode = "JPYC" | "USDC";
export type ProjectIdsByCurrency = Record<CurrencyCode, string | null>;

export type SummaryProject = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currency?: CurrencyCode;
  purposeMode: string;
  ownerAddress: string | null;
  creatorProfileId: string | null;
  bridgedAt: string | null;
  distributedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SummaryGoal = {
  id: string;
  unitCurrency?: CurrencyCode;
  targetAmount: number;
  targetAmountJpyc?: number;
  achievedAt: string | null;
  deadline: string | null;
} | null;

export type SummaryProgress = {
  currency?: CurrencyCode;
  confirmedAmount: number;
  confirmedTotal?: number;
  confirmedJpyc?: number;
  confirmedByCurrency?: {
    JPYC: number;
    USDC: number;
  };
  targetAmount: number | null;
  targetJpyc?: number | null;
  progressPct: number;
  totals: {
    JPYC: string | null;
    USDC: string | null;
  };
};

export type BridgeRunLite = {
  id: string;
  mode: string;
  currency: string;
  dryRun: boolean;
  force: boolean;
  createdAt: string;
  dbConfirmedTotalAmountDecimal: string | null;
};

export type DistributionRunLite = {
  id: string;
  mode: string;
  chainId: number;
  currency: string;
  dryRun: boolean;
  createdAt: string;
  txHashes: unknown;
};

export type SummaryResponseOk = {
  ok: true;
  project: SummaryProject;
  goal: SummaryGoal;
  progress: SummaryProgress;
  distributionPlan: unknown;
  lastBridgeRuns: BridgeRunLite[];
  lastDistributionRuns: DistributionRunLite[];
};

export type SummaryViewData = Omit<SummaryResponseOk, "ok">;

export type SummaryResponseErr = {
  ok: false;
  error: string;
};

export type SummaryResponse = SummaryResponseOk | SummaryResponseErr;

export type UiMsg = { kind: "info" | "error" | "success"; text: string };

export type GoalDraft = {
  targetInput: string;
  deadlineInput: string;
  msg: string | null;
};

export type GoalDraftByCurrency = Record<CurrencyCode, GoalDraft>;

export function formatAmountByCurrency(
  amount: number,
  currency: CurrencyCode
): string {
  if (!Number.isFinite(amount)) {
    return currency === "USDC" ? "0.00" : "0";
  }
  if (currency === "USDC") {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.floor(amount).toLocaleString();
}
