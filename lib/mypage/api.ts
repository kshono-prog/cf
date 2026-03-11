// /lib/mypage/api.ts
import type { Address } from "viem";
import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";
import type { GasEligibility, MeStatus } from "../../lib/mypage/types";
import type { MyPageDashboardData } from "../../lib/mypage/dashboardTypes";
import type {
  CurrencyCode,
  SummaryProject,
  SummaryResponse,
  SummaryResponseOk,
} from "../../lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "../../lib/projectSettlementView";
import type { WorkspaceView } from "../../lib/mypage/workspaceView";
import type {
  MyPageCreatorMutationOk,
  MyPageMutationOk,
} from "../../lib/mypageApiResponses";
import {
  getErrorFromApiJson,
  isRecord,
} from "../../lib/mypage/helpers";

/**
 * wagmi/viem の Address (`0x${string}`) をそのまま受け取る
 * - 呼び出し元で undefined を排除すればOK
 * - 以後「文字列だけどアドレスじゃない」を混入させない
 */

export async function fetchMe(args: {
  apiBase: string;
  address: Address;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const res = await fetch(`${args.apiBase}/api/me?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  // MeStatus の shape を厳密に検証したいなら型ガードを追加可能
  return { ok: true, data: data as MeStatus };
}

export async function fetchMyPageDashboard(args: {
  apiBase: string;
  address: Address;
  view: WorkspaceView;
}): Promise<{ ok: true; data: MyPageDashboardData } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
    view: args.view,
  });
  const res = await fetch(
    `${args.apiBase}/api/mypage/dashboard?${params.toString()}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  return { ok: true, data: data as MyPageDashboardData };
}

async function requestJson(args: {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  cache?: RequestCache;
}): Promise<{ res: Response; json: unknown }> {
  const res = await fetch(args.url, {
    method: args.method ?? "GET",
    headers: args.body ? { "Content-Type": "application/json" } : undefined,
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
    cache: args.cache,
  });
  const json: unknown = await res.json().catch(() => null);
  return { res, json };
}

function toApiError(json: unknown, fallback: string): string {
  return getErrorFromApiJson(json) ?? fallback;
}

export type MyPageProjectRecord = {
  id: string;
  title: string;
  description: string | null;
  purposeMode: string;
  status: string;
};

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProjectRecord(
  value: unknown,
  fallbackProjectId?: string
): MyPageProjectRecord | null {
  if (!isRecord(value)) return null;

  const id = asNonEmptyString(value.id) ?? fallbackProjectId ?? null;
  if (!id) return null;

  return {
    id,
    title: asNonEmptyString(value.title) ?? "(untitled)",
    description: asStringOrNull(value.description),
    purposeMode: asNonEmptyString(value.purposeMode) ?? "OPTIONAL",
    status: asNonEmptyString(value.status) ?? "DRAFT",
  };
}

export function hydrateMyPageProjectRecord(
  project: SummaryProject | null | undefined
): MyPageProjectRecord | null {
  if (!project) return null;
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    purposeMode: project.purposeMode,
    status: project.status,
  };
}

export async function saveMyPageUser(args: {
  apiBase: string;
  address: Address;
  username: string;
  displayName: string;
  profile: string;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `${args.apiBase}/api/user`,
    method: "POST",
    body: {
      address: args.address,
      username: args.username,
      displayName: args.displayName,
      profile: args.profile,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "USER_SAVE_FAILED"),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true || !isRecord(json.me)) {
    return {
      ok: false,
      error: "USER_SAVE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: (json as MyPageMutationOk).me as MeStatus };
}

export async function requestCreatorApply(args: {
  apiBase: string;
  address: Address;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `${args.apiBase}/api/creator/apply`,
    method: "POST",
    body: { address: args.address },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "CREATOR_APPLY_FAILED"),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true || !isRecord(json.me)) {
    return {
      ok: false,
      error: "CREATOR_APPLY_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: (json as MyPageMutationOk).me as MeStatus };
}

export async function updateMyPageCreatorProfile(args: {
  address: Address;
  displayName: string;
  profile: string;
  avatarUrl: string;
  themeColor: string;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
}): Promise<
  | { ok: true; data: MeStatus; creator: CreatorProfile | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: "/api/creator",
    method: "PATCH",
    body: {
      address: args.address,
      displayName: args.displayName,
      profile: args.profile,
      avatarUrl: args.avatarUrl || null,
      themeColor: args.themeColor.trim() || null,
      socials: args.socials,
      youtubeVideos: args.youtubeVideos.map((video) => ({
        url: video.url.trim(),
        title: video.title.trim(),
        description: video.description.trim(),
      })),
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "CREATOR_UPDATE_FAILED"),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true || !isRecord(json.me)) {
    return {
      ok: false,
      error: "CREATOR_UPDATE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    data: (json as MyPageCreatorMutationOk).me as MeStatus,
    creator: (json as MyPageCreatorMutationOk).creator ?? null,
  };
}

export async function fetchProjectSummary(args: {
  projectId: string;
}): Promise<
  | { ok: true; data: SummaryResponseOk }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/summary`,
    cache: "no-store",
  });

  if (!json || typeof json !== "object") {
    return {
      ok: false,
      error: "SUMMARY_INVALID_RESPONSE",
      httpStatus: res.status,
    };
  }

  const response = json as Partial<SummaryResponse>;
  if (response.ok === true && isRecord(response.project) && isRecord(response.progress)) {
    return {
      ok: true,
      data: json as SummaryResponseOk,
    };
  }

  if (response.ok === false && typeof response.error === "string") {
    return {
      ok: false,
      error: response.error,
      httpStatus: res.status,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `HTTP_${res.status}`),
      httpStatus: res.status,
    };
  }

  return {
    ok: false,
    error: "SUMMARY_UNEXPECTED_SHAPE",
    httpStatus: res.status,
  };
}

export async function fetchProjectSettlement(args: {
  projectId: string;
}): Promise<
  | { ok: true; data: ProjectSettlementData }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement`,
    cache: "no-store",
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

export async function saveProjectGoal(args: {
  projectId: string;
  address: string;
  targetAmount: number;
  deadline: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/goal`,
    method: "PUT",
    body: {
      address: args.address,
      targetAmount: args.targetAmount,
      targetAmountJpyc: args.targetAmount,
      deadline: args.deadline,
    },
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

export async function achieveProjectGoal(args: {
  projectId: string;
  address: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/goal/achieve`,
    method: "POST",
    body: {
      address: args.address,
    },
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

export async function recomputeProjectSettlement(args: {
  projectId: string;
}): Promise<{ ok: true } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/settlement`,
    method: "PUT",
    body: { action: "RECOMPUTE" },
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

export async function fetchMyPageProject(args: {
  projectId: string;
  apiBase?: string;
}): Promise<
  | { ok: true; data: MyPageProjectRecord }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/projects/${encodeURIComponent(args.projectId)}`,
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, `PROJECT_FETCH_FAILED_${res.status}`),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true) {
    return {
      ok: false,
      error: "PROJECT_FETCH_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  const project = normalizeProjectRecord(json.project, args.projectId);
  if (!project) {
    return {
      ok: false,
      error: "PROJECT_FETCH_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: project };
}

export async function createMyPageProject(args: {
  ownerAddress: string;
  title: string;
  description: string | null;
  purposeMode: string;
  currency?: CurrencyCode;
  apiBase?: string;
}): Promise<
  | { ok: true; projectId: string; project: MyPageProjectRecord | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/projects`,
    method: "POST",
    body: {
      ownerAddress: args.ownerAddress,
      title: args.title,
      description: args.description,
      purposeMode: args.purposeMode,
      currency: args.currency,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "PROJECT_CREATE_FAILED"),
      httpStatus: res.status,
    };
  }

  const projectId =
    (isRecord(json) ? asNonEmptyString(json.activeProjectId) : null) ??
    (isRecord(json) ? asNonEmptyString(json.id) : null) ??
    (isRecord(json) && isRecord(json.project)
      ? asNonEmptyString(json.project.id)
      : null);

  if (!projectId) {
    return {
      ok: false,
      error: "PROJECT_CREATE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    projectId,
    project:
      isRecord(json) && isRecord(json.project)
        ? normalizeProjectRecord(json.project, projectId)
        : null,
  };
}

export async function updateMyPageProject(args: {
  projectId: string;
  title: string;
  description: string | null;
  purposeMode: string;
  apiBase?: string;
}): Promise<
  | { ok: true; data: MyPageProjectRecord }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/projects/${encodeURIComponent(args.projectId)}`,
    method: "PUT",
    body: {
      title: args.title,
      description: args.description,
      purposeMode: args.purposeMode,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "PROJECT_UPDATE_FAILED"),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true) {
    return {
      ok: false,
      error: "PROJECT_UPDATE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  const project = normalizeProjectRecord(json.project, args.projectId);
  if (!project) {
    return {
      ok: false,
      error: "PROJECT_UPDATE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: project };
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

export async function fetchGasEligibility(args: {
  apiBase: string;
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; data: GasEligibility } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
  });
  if (typeof args.chainId === "number") {
    params.set("chainId", String(args.chainId));
  }
  const res = await fetch(
    `${args.apiBase}/api/gas-support/eligibility?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  return { ok: true, data: data as GasEligibility };
}

export async function fetchGasNonce(args: {
  apiBase: string;
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
  });
  if (typeof args.chainId === "number") {
    params.set("chainId", String(args.chainId));
  }
  const res = await fetch(
    `${args.apiBase}/api/gas-support/nonce?${params.toString()}`,
    { cache: "no-store" }
  );
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "NONCE_ERROR";
    return { ok: false, error: msg };
  }
  if (!isRecord(json) || typeof json.message !== "string") {
    return { ok: false, error: "NONCE_RESPONSE_INVALID" };
  }
  return { ok: true, message: json.message };
}

export async function claimGasSupport(args: {
  apiBase: string;
  address: Address;
  message: string;
  signature: string;
  chainId?: number;
}): Promise<
  { ok: true; txHash: string | null } | { ok: false; error: string }
> {
  const res = await fetch(`${args.apiBase}/api/gas-support/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: args.address,
      message: args.message,
      signature: args.signature,
      chainId: args.chainId,
    }),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "CLAIM_ERROR";
    return { ok: false, error: msg };
  }

  const txHash =
    isRecord(json) && typeof json.txHash === "string" ? json.txHash : null;

  return { ok: true, txHash };
}

export async function createProject(args: {
  apiBase: string;
  payload: {
    title: string;
    description: string | null;
    purposeMode: string;
    currency?: "JPYC" | "USDC";
    ownerAddress: Address;
    address: Address; // API が address 必須でも通す保険、同じ値を入れる想定
  };
}): Promise<
  | { ok: true; id: string | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const result = await createMyPageProject({
    apiBase: args.apiBase,
    ownerAddress: args.payload.ownerAddress,
    title: args.payload.title,
    description: args.payload.description,
    purposeMode: args.payload.purposeMode,
    currency: args.payload.currency,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, id: result.projectId };
}
