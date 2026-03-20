import type { Address } from "viem";

import type {
  CurrencyCode,
  SummaryProject,
  SummaryResponse,
  SummaryResponseOk,
} from "@/lib/mypage/accountPageTypes";
import { toNonEmptyString } from "@/lib/api/guards";
import {
  isRecord,
  requestJson,
  toApiError,
  asStringOrNull,
} from "@/lib/mypage/mypageApiShared";

export type MyPageProjectRecord = {
  id: string;
  title: string;
  description: string | null;
  purposeMode: string;
  status: string;
};

function normalizeProjectRecord(
  value: unknown,
  fallbackProjectId?: string
): MyPageProjectRecord | null {
  if (!isRecord(value)) return null;

  const id = toNonEmptyString(value.id) ?? fallbackProjectId ?? null;
  if (!id) return null;

  return {
    id,
    title: toNonEmptyString(value.title) ?? "(untitled)",
    description: asStringOrNull(value.description),
    purposeMode: toNonEmptyString(value.purposeMode) ?? "OPTIONAL",
    status: toNonEmptyString(value.status) ?? "DRAFT",
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

export async function fetchMyPageProject(args: {
  projectId: string;
  ownerAddress: string;
  apiBase?: string;
}): Promise<
  | { ok: true; data: MyPageProjectRecord }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/projects/${encodeURIComponent(args.projectId)}`,
    cache: "no-store",
    authAddress: args.ownerAddress,
    apiBase: args.apiBase,
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
    authAddress: args.ownerAddress,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "PROJECT_CREATE_FAILED"),
      httpStatus: res.status,
    };
  }

  const projectId =
    (isRecord(json) ? toNonEmptyString(json.projectId) : null) ??
    (isRecord(json) ? toNonEmptyString(json.id) : null) ??
    (isRecord(json) && isRecord(json.project)
      ? toNonEmptyString(json.project.id)
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
  ownerAddress: string;
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
    authAddress: args.ownerAddress,
    apiBase: args.apiBase,
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

export async function createProject(args: {
  apiBase: string;
  payload: {
    title: string;
    description: string | null;
    purposeMode: string;
    currency?: "JPYC" | "USDC";
    ownerAddress: Address;
    address: Address;
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
