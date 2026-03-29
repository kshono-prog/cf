import { getAddress, isAddress, isHash } from "viem";

import { isRecord, toOptionalString } from "@/lib/api/guards";
import type { AiManagerVerifiedPayee } from "@/lib/aiManager/payeeRegistry";
import { isUuidString } from "@/lib/social";

export type AiManagerX402ConnectorSettlementStatus = "CONFIRMED" | "FAILED";

export type ParsedAiManagerX402ConnectorSettlementPayload = {
  paymentAttemptId: string;
  status: AiManagerX402ConnectorSettlementStatus;
  txHash: string | null;
  failureReason: string | null;
  payeeId: string | null;
  payeeWalletAddress: string | null;
};

export type ParsedAiManagerX402ConnectorPendingObservationPayload = {
  paymentAttemptId: string;
  detail: string | null;
  payeeId: string | null;
  payeeWalletAddress: string | null;
};

function normalizeOptionalWalletAddress(value: unknown): string | null {
  const wallet = toOptionalString(value);
  if (!wallet) return null;
  if (!isAddress(wallet, { strict: false })) {
    throw new Error("AI_MANAGER_X402_CONNECTOR_PAYEE_WALLET_INVALID");
  }
  return getAddress(wallet);
}

function parseOptionalShortText(args: {
  value: unknown;
  errorCode: string;
}): string | null {
  const { value, errorCode } = args;
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error(errorCode);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 240) {
    throw new Error(errorCode);
  }
  return trimmed;
}

function parseOptionalFailureReason(value: unknown): string | null {
  return parseOptionalShortText({
    value,
    errorCode: "AI_MANAGER_X402_CONNECTOR_FAILURE_REASON_INVALID",
  });
}

function parseOptionalPendingObservationDetail(value: unknown): string | null {
  return parseOptionalShortText({
    value,
    errorCode: "AI_MANAGER_X402_CONNECTOR_PENDING_DETAIL_INVALID",
  });
}

function parseOptionalTxHash(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_X402_CONNECTOR_TX_HASH_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!isHash(trimmed)) {
    throw new Error("AI_MANAGER_X402_CONNECTOR_TX_HASH_INVALID");
  }
  return trimmed;
}

export function authorizeAiManagerX402ConnectorRequest(args: {
  authorizationHeader: string | null;
  expectedToken: string | null;
}): string | null {
  if (!args.expectedToken) {
    return "AI_MANAGER_X402_CONNECTOR_DISABLED";
  }

  if (!args.authorizationHeader) {
    return "AI_MANAGER_X402_CONNECTOR_UNAUTHORIZED";
  }

  const [scheme, token, ...rest] = args.authorizationHeader.trim().split(/\s+/);
  if (
    scheme !== "Bearer" ||
    !token ||
    rest.length > 0 ||
    token !== args.expectedToken
  ) {
    return "AI_MANAGER_X402_CONNECTOR_UNAUTHORIZED";
  }

  return null;
}

export function parseAiManagerX402ConnectorSettlementPayload(
  value: unknown
): ParsedAiManagerX402ConnectorSettlementPayload {
  if (!isRecord(value)) {
    throw new Error("INVALID_JSON");
  }

  const paymentAttemptId = toOptionalString(value.paymentAttemptId);
  if (!paymentAttemptId || !isUuidString(paymentAttemptId)) {
    throw new Error("AI_MANAGER_X402_CONNECTOR_PAYMENT_ATTEMPT_ID_INVALID");
  }

  const status = value.status;
  if (status !== "CONFIRMED" && status !== "FAILED") {
    throw new Error("AI_MANAGER_X402_CONNECTOR_STATUS_INVALID");
  }

  const txHash = parseOptionalTxHash(value.txHash);
  if (status === "CONFIRMED" && !txHash) {
    throw new Error("AI_MANAGER_X402_CONNECTOR_TX_HASH_REQUIRED");
  }

  const failureReason = parseOptionalFailureReason(value.failureReason);
  const payeeId = toOptionalString(value.payeeId) ?? null;
  const payeeWalletAddress = normalizeOptionalWalletAddress(
    value.payeeWalletAddress
  );

  return {
    paymentAttemptId,
    status,
    txHash,
    failureReason,
    payeeId,
    payeeWalletAddress,
  };
}

export function parseAiManagerX402ConnectorPendingObservationPayload(
  value: unknown
): ParsedAiManagerX402ConnectorPendingObservationPayload {
  if (!isRecord(value)) {
    throw new Error("INVALID_JSON");
  }

  const paymentAttemptId = toOptionalString(value.paymentAttemptId);
  if (!paymentAttemptId || !isUuidString(paymentAttemptId)) {
    throw new Error("AI_MANAGER_X402_CONNECTOR_PAYMENT_ATTEMPT_ID_INVALID");
  }

  return {
    paymentAttemptId,
    detail: parseOptionalPendingObservationDetail(value.detail),
    payeeId: toOptionalString(value.payeeId) ?? null,
    payeeWalletAddress: normalizeOptionalWalletAddress(value.payeeWalletAddress),
  };
}

export function validateAiManagerX402ConnectorPayee(args: {
  payload: Pick<
    ParsedAiManagerX402ConnectorSettlementPayload,
    "payeeId" | "payeeWalletAddress"
  >;
  verifiedPayee: AiManagerVerifiedPayee;
}): string | null {
  if (args.verifiedPayee.verificationStatus !== "VERIFIED") {
    return "AI_MANAGER_X402_CONNECTOR_PAYEE_UNVERIFIED";
  }

  if (
    args.payload.payeeId &&
    args.payload.payeeId !== args.verifiedPayee.id
  ) {
    return "AI_MANAGER_X402_CONNECTOR_PAYEE_MISMATCH";
  }

  if (
    args.payload.payeeWalletAddress &&
    args.payload.payeeWalletAddress !== args.verifiedPayee.walletAddress
  ) {
    return "AI_MANAGER_X402_CONNECTOR_PAYEE_MISMATCH";
  }

  return null;
}
