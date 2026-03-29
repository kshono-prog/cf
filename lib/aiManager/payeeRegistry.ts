import { AI_MANAGER_PLATFORM_OPERATIONS_PAYEE_ID } from "@/lib/aiManager/config";

export const AI_MANAGER_PAYEE_VERIFICATION_STATUSES = [
  "VERIFIED",
  "UNVERIFIED",
] as const;

export type AiManagerPayeeVerificationStatus =
  (typeof AI_MANAGER_PAYEE_VERIFICATION_STATUSES)[number];

export type AiManagerVerifiedPayee = {
  id: string;
  label: string;
  walletAddress: string | null;
  x402EndpointUrl: string | null;
  verificationStatus: AiManagerPayeeVerificationStatus;
};

function includesValue<T extends string>(
  choices: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

export function isAiManagerPayeeVerificationStatus(
  value: unknown
): value is AiManagerPayeeVerificationStatus {
  return includesValue(AI_MANAGER_PAYEE_VERIFICATION_STATUSES, value);
}

export function resolveAiManagerPlatformOperationsPayee(args: {
  platformOperationsWalletAddress: string | null;
  x402EndpointUrl: string | null;
}): AiManagerVerifiedPayee {
  const verificationStatus: AiManagerPayeeVerificationStatus =
    args.platformOperationsWalletAddress && args.x402EndpointUrl
      ? "VERIFIED"
      : "UNVERIFIED";

  return {
    id: AI_MANAGER_PLATFORM_OPERATIONS_PAYEE_ID,
    label: "Platform Operations Wallet",
    walletAddress: args.platformOperationsWalletAddress,
    x402EndpointUrl: args.x402EndpointUrl,
    verificationStatus,
  };
}
