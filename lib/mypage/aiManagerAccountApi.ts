import type { Address } from "viem";

import {
  parseAiManagerAccount,
  parseAiManagerFundingInstructions,
  type SerializedAiManagerAccount,
  type SerializedAiManagerFundingInstructions,
} from "@/lib/serializers/aiManager";
import { requestJson, isRecord, toApiError } from "@/lib/mypage/mypageApiShared";
import type {
  AiManagerArchetype,
  AiManagerBillingMode,
  AiManagerBillableCapability,
  AiManagerDisclosurePolicy,
  AiManagerPaymentRail,
  AiManagerPublicVisibility,
  AiManagerStatus,
  AiManagerSupportStyle,
  AiManagerTone,
} from "@/lib/aiManager/config";

export type UpdateAiManagerAccountInput = {
  displayName: string;
  slug: string;
  intro: string;
  archetype: AiManagerArchetype;
  publicVisibility: AiManagerPublicVisibility;
  status: AiManagerStatus;
  primaryLanguage: string;
  tone: AiManagerTone;
  supportStyle: AiManagerSupportStyle;
  disclosurePolicy: AiManagerDisclosurePolicy;
  managerActivityWalletAddress: string;
  budgetWalletAddress: string;
  specialties: string[];
  forbiddenTopics: string[];
  brandGuardrails: string[];
  billing: {
    billingMode: AiManagerBillingMode;
    preferredRail: AiManagerPaymentRail;
    freeTierEnabled: boolean;
    autoPayEnabled: boolean;
    monthlyJpycCap: number;
    dailyJpycCap: number;
    perActionJpycCap: number;
    allowedBillableCapabilities: AiManagerBillableCapability[];
  };
};

export type OperateAiManagerBudgetInput = {
  action: "TOP_UP" | "DEDUCT";
  amount: string;
  note: string;
  fundingEvidenceId?: string;
};

export type ReportAiManagerFundingEvidenceInput = {
  txHash: string;
  amount: string;
  note: string;
  fromWalletAddress: string;
};

export type UpdateAiManagerPaymentAttemptInput = {
  paymentAttemptId: string;
  action: "CONFIRM_X402" | "MARK_FAILED";
  txHash?: string;
  note?: string;
};

function parseAiManagerFundingResponse(
  json: unknown
): SerializedAiManagerFundingInstructions | null {
  if (!isRecord(json) || json.ok !== true) return null;
  return parseAiManagerFundingInstructions(json.funding);
}

function parseAiManagerResponse(
  json: unknown
): SerializedAiManagerAccount | null {
  if (!isRecord(json) || json.ok !== true) return null;
  return parseAiManagerAccount(json.account);
}

export async function fetchAiManagerAccount(args: {
  address: Address;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount | null }
  | { ok: false; error: string }
> {
  const params = new URLSearchParams({ address: args.address });
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager?${params.toString()}`,
    authAddress: args.address,
    apiBase: args.apiBase,
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "AI_MANAGER_FETCH_FAILED") };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "AI_MANAGER_FETCH_RESPONSE_INVALID" };
  }

  const account =
    json.account === null ? null : parseAiManagerAccount(json.account);
  if (json.account !== null && !account) {
    return { ok: false, error: "AI_MANAGER_FETCH_RESPONSE_INVALID" };
  }

  return { ok: true, account };
}

export async function createAiManagerAccount(args: {
  address: Address;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount; created: boolean }
  | { ok: false; error: string }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager`,
    method: "POST",
    body: { address: args.address },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "AI_MANAGER_CREATE_FAILED") };
  }

  const account = parseAiManagerResponse(json);
  if (!account || !isRecord(json) || typeof json.created !== "boolean") {
    return { ok: false, error: "AI_MANAGER_CREATE_RESPONSE_INVALID" };
  }

  return { ok: true, account, created: json.created };
}

export async function fetchAiManagerFundingInstructions(args: {
  address: Address;
  apiBase?: string;
}): Promise<
  | { ok: true; funding: SerializedAiManagerFundingInstructions }
  | { ok: false; error: string }
> {
  const params = new URLSearchParams({ address: args.address });
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager/funding?${params.toString()}`,
    authAddress: args.address,
    apiBase: args.apiBase,
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "AI_MANAGER_FUNDING_FETCH_FAILED"),
    };
  }

  const funding = parseAiManagerFundingResponse(json);
  if (!funding) {
    return { ok: false, error: "AI_MANAGER_FUNDING_FETCH_RESPONSE_INVALID" };
  }

  return { ok: true, funding };
}

export async function reportAiManagerFundingEvidence(args: {
  address: Address;
  input: ReportAiManagerFundingEvidenceInput;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount }
  | { ok: false; error: string }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager/funding-evidence`,
    method: "POST",
    body: {
      address: args.address,
      ...args.input,
    },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "AI_MANAGER_FUNDING_EVIDENCE_CREATE_FAILED"),
    };
  }

  const account = parseAiManagerResponse(json);
  if (!account) {
    return {
      ok: false,
      error: "AI_MANAGER_FUNDING_EVIDENCE_RESPONSE_INVALID",
    };
  }

  return { ok: true, account };
}

export async function updateAiManagerPaymentAttempt(args: {
  address: Address;
  input: UpdateAiManagerPaymentAttemptInput;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount }
  | { ok: false; error: string }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager/payment-attempts`,
    method: "POST",
    body: {
      address: args.address,
      ...args.input,
    },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "AI_MANAGER_PAYMENT_ATTEMPT_UPDATE_FAILED"),
    };
  }

  const account = parseAiManagerResponse(json);
  if (!account) {
    return {
      ok: false,
      error: "AI_MANAGER_PAYMENT_ATTEMPT_RESPONSE_INVALID",
    };
  }

  return { ok: true, account };
}

export async function updateAiManagerAccount(args: {
  address: Address;
  input: UpdateAiManagerAccountInput;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount }
  | { ok: false; error: string }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager`,
    method: "PATCH",
    body: {
      address: args.address,
      ...args.input,
    },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "AI_MANAGER_UPDATE_FAILED") };
  }

  const account = parseAiManagerResponse(json);
  if (!account) {
    return { ok: false, error: "AI_MANAGER_UPDATE_RESPONSE_INVALID" };
  }

  return { ok: true, account };
}

export async function operateAiManagerBudget(args: {
  address: Address;
  input: OperateAiManagerBudgetInput;
  apiBase?: string;
}): Promise<
  | { ok: true; account: SerializedAiManagerAccount; action: "TOP_UP" | "DEDUCT"; amount: string }
  | { ok: false; error: string }
> {
  const { res, json } = await requestJson({
    url: `${args.apiBase ?? ""}/api/creator/ai-manager/budget`,
    method: "POST",
    body: {
      address: args.address,
      ...args.input,
    },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "AI_MANAGER_BUDGET_OPERATION_FAILED") };
  }

  const account = parseAiManagerResponse(json);
  if (
    !account ||
    !isRecord(json) ||
    !isRecord(json.operation) ||
    (json.operation.action !== "TOP_UP" && json.operation.action !== "DEDUCT") ||
    typeof json.operation.amount !== "string"
  ) {
    return { ok: false, error: "AI_MANAGER_BUDGET_OPERATION_RESPONSE_INVALID" };
  }

  return {
    ok: true,
    account,
    action: json.operation.action,
    amount: json.operation.amount,
  };
}
