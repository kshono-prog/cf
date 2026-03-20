import type { Address } from "viem";

import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import {
  isRecord,
  requestJson,
  toApiError,
} from "@/lib/mypage/mypageApiShared";

export async function fetchProjectSettlement(args: {
  projectId: string;
  address: string;
}): Promise<
  | { ok: true; data: ProjectSettlementData }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement`,
    cache: "no-store",
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  if (
    !isRecord(json) ||
    json.ok !== true ||
    !isRecord(json.project) ||
    !isRecord(json.settlement) ||
    !Array.isArray(json.bridgeSteps) ||
    !Array.isArray(json.distributionEntries) ||
    !Array.isArray(json.recentExecutions) ||
    !Array.isArray(json.cctpJobs)
  ) {
    return {
      ok: false,
      error: "SETTLEMENT_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: json as ProjectSettlementData };
}

export async function recomputeProjectSettlement(args: {
  projectId: string;
  address: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement`,
    method: "PUT",
    body: { action: "RECOMPUTE" },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function recordProjectSettlementBridge(args: {
  projectId: string;
  address: string;
  sourceChain: "POLYGON" | "ETHEREUM";
  token: CurrencyCode;
  bridgedAmountAtomic: string;
  txHash?: string;
  completedAt?: string;
  memo?: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement/bridge`,
    method: "POST",
    body: {
      address: args.address,
      sourceChain: args.sourceChain,
      token: args.token,
      bridgedAmountAtomic: args.bridgedAmountAtomic,
      txHash: args.txHash,
      completedAt: args.completedAt,
      memo: args.memo,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function saveProjectSettlementDistributions(args: {
  projectId: string;
  address: string;
  entries: Array<{
    id?: string;
    recipientAddress: string;
    amountAtomic: string;
    memo?: string;
    token: CurrencyCode;
    orderIndex: number;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement/distributions`,
    method: "PUT",
    body: {
      address: args.address,
      entries: args.entries,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function saveProjectSettlementDistributionResult(args: {
  projectId: string;
  address: string;
  entryId: string;
  status: "SENT" | "FAILED";
  txHash?: string;
  executionId?: string;
  errorReason?: string;
}): Promise<
  | { ok: true; executionId: string | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement/distribution-result`,
    method: "POST",
    body: {
      address: args.address,
      executionId: args.executionId,
      entryId: args.entryId,
      status: args.status,
      txHash: args.txHash,
      errorReason: args.errorReason,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    executionId:
      isRecord(json) && typeof json.executionId === "string"
        ? json.executionId
        : null,
  };
}

export async function saveProjectDistributionPlan(args: {
  projectId: string;
  address: Address;
  plan: unknown;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/distribution/plan`,
    method: "PUT",
    body: {
      address: args.address,
      plan: args.plan,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function saveProjectDistributionResult(args: {
  projectId: string;
  address: Address;
  chainId: number;
  currency: CurrencyCode;
  txHashes: string[];
  dryRun: boolean;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/distribution/execute`,
    method: "POST",
    body: {
      address: args.address,
      chainId: args.chainId,
      currency: args.currency,
      txHashes: args.txHashes,
      dryRun: args.dryRun,
      note: args.note,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function runProjectCctpAction(args: {
  projectId: string;
  address: string;
  action:
    | "SYNC_FROM_GOAL"
    | "MARK_BURN_SUBMITTED"
    | "FETCH_ATTESTATION"
    | "MARK_MINT_SUBMITTED"
    | "COMPLETE"
    | "FAIL"
    | "RETRY";
  payload?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/cctp/jobs`,
    method: "POST",
    body: {
      address: args.address,
      action: args.action,
      ...(args.payload ?? {}),
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function prepareProjectBridge(args: {
  projectId: string;
  address: string;
  currency: CurrencyCode;
  provider?: "WORMHOLE_UI" | "MANUAL";
}): Promise<
  | { ok: true; data: unknown }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/bridge/prepare`,
    method: "POST",
    body: {
      address: args.address,
      currency: args.currency,
      provider: args.provider ?? "MANUAL",
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true, data: json };
}

export async function saveProjectBridgeRun(args: {
  projectId: string;
  address: string;
  bridgeRunId: string;
  bridgeTxHash: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/bridge/run`,
    method: "POST",
    body: {
      address: args.address,
      bridgeRunId: args.bridgeRunId,
      bridgeTxHash: args.bridgeTxHash,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true };
}

export async function reverifyProjectBridge(args: {
  projectId: string;
  address: string;
  bridgeRunId: string;
}): Promise<
  | { ok: true; data: unknown }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/bridge/reverify`,
    method: "POST",
    body: {
      address: args.address,
      bridgeRunId: args.bridgeRunId,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return { ok: true, data: json };
}
