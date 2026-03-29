import "server-only";

import type {
  AiManagerPaymentAttemptRail,
  AiManagerPaymentRail,
} from "@/lib/aiManager/config";
import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";
import type {
  SerializedAiManagerFundingInstructions,
  SerializedAiManagerFundingX402Status,
} from "@/lib/serializers/aiManager";
import {
  resolveAiManagerPlatformOperationsPayee,
  type AiManagerPayeeVerificationStatus,
} from "@/lib/aiManager/payeeRegistry";

type BuildAiManagerFundingInstructionsArgs = {
  aiManagerAccountId: string;
  ownerControlWalletAddress: string | null;
  budgetWalletAddress: string | null;
  preferredRail: AiManagerPaymentRail;
  currency: string;
  platformOperationsWalletAddress: string | null;
  platformOperationsChainId: SupportedChainId;
  x402EndpointUrl: string | null;
  settlementTokenAddress: string | null;
};

export type AiManagerSettlementRailResolution = {
  x402Status: SerializedAiManagerFundingX402Status;
  activeSettlementRail: AiManagerPaymentAttemptRail;
};

function buildReferenceCode(aiManagerAccountId: string): string {
  const compact = aiManagerAccountId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return compact.length > 0 ? `CF-AI-${compact}` : "CF-AI";
}

export function resolveAiManagerSettlementRail(args: {
  preferredRail: AiManagerPaymentRail;
  payeeVerificationStatus: AiManagerPayeeVerificationStatus;
  settlementTokenAddress: string | null;
}): AiManagerSettlementRailResolution {
  if (args.preferredRail !== "X402_PREFERRED") {
    return {
      x402Status: "INTERNAL_LEDGER_ONLY",
      activeSettlementRail: "INTERNAL_LEDGER",
    };
  }

  if (
    args.payeeVerificationStatus === "VERIFIED" &&
    args.settlementTokenAddress
  ) {
    return {
      x402Status: "X402_READY",
      activeSettlementRail: "X402",
    };
  }

  return {
    x402Status: "X402_CONFIG_REQUIRED",
    activeSettlementRail: "INTERNAL_LEDGER",
  };
}

export function buildAiManagerFundingInstructions(
  args: BuildAiManagerFundingInstructionsArgs
): SerializedAiManagerFundingInstructions {
  const chain = getChainConfig(args.platformOperationsChainId);
  if (!chain) {
    throw new Error("AI_MANAGER_PLATFORM_CHAIN_INVALID");
  }

  const payee = resolveAiManagerPlatformOperationsPayee({
    platformOperationsWalletAddress: args.platformOperationsWalletAddress,
    x402EndpointUrl: args.x402EndpointUrl,
  });

  const { x402Status, activeSettlementRail } = resolveAiManagerSettlementRail({
    preferredRail: args.preferredRail,
    payeeVerificationStatus: payee.verificationStatus,
    settlementTokenAddress: args.settlementTokenAddress,
  });

  const referenceCode = buildReferenceCode(args.aiManagerAccountId);
  const warnings: string[] = [];
  if (!args.ownerControlWalletAddress) {
    warnings.push(
      "owner control wallet が未確認のため、実ウォレット top-up を始める前に接続状態を確認してください。"
    );
  }
  if (!args.budgetWalletAddress) {
    warnings.push(
      "AI budget wallet が未設定のため、実ウォレットからの top-up 先をまだ確定できません。"
    );
  }
  if (!args.platformOperationsWalletAddress) {
    warnings.push(
      "Platform Operations Wallet が未設定のため、billable settlement は internal ledger 境界のままです。"
    );
  }
  if (payee.verificationStatus !== "VERIFIED") {
    warnings.push(
      `${payee.label} が verified payee registry で未検証のため、x402 はまだ有効化されません。`
    );
  }
  if (!args.settlementTokenAddress) {
    warnings.push(
      `${args.currency} token address が ${chain.shortName} で未設定のため、real wallet top-up instructions は参考表示に留まります。`
    );
  }
  if (x402Status === "X402_CONFIG_REQUIRED") {
    warnings.push(
      "x402 endpoint または payee 設定が未完了のため、現時点の active settlement rail は internal ledger fallback です。"
    );
  }

  const steps = args.budgetWalletAddress
    ? [
        `AI budget wallet に ${args.currency} を積むと、無料範囲を超える billable capability を使えるようになります。`,
        `${chain.shortName} 上の ${args.currency} を AI budget wallet に送金し、reference code ${referenceCode} を照合用に控えてください。`,
        `billable usage が発生すると、AI Manager は ${payee.label} へ ${activeSettlementRail === "X402" ? "x402" : "internal ledger fallback"} で settlement を試みます。`,
        "owner 側では cap と予算残高を合わせて管理し、fund movement 本体は従来どおり明示的に扱います。",
      ]
    : [
        "まず AI budget wallet を設定し、real wallet top-up の受け口を作ります。",
        `その後、${chain.shortName} 上の ${args.currency} を budget wallet に積んで billable capability を有効化します。`,
        `billable usage の payee は ${payee.label} で固定され、settlement rail は ${activeSettlementRail === "X402" ? "x402" : "internal ledger fallback"} です。`,
      ];

  return {
    ownerControlWalletAddress: args.ownerControlWalletAddress,
    budgetWalletAddress: args.budgetWalletAddress,
    payeeId: payee.id,
    payeeLabel: payee.label,
    payeeVerificationStatus: payee.verificationStatus,
    platformOperationsWalletAddress: payee.walletAddress,
    currency: args.currency,
    chainId: chain.id,
    chainName: chain.name,
    chainShortName: chain.shortName,
    tokenSymbol: "JPYC",
    tokenAddress: args.settlementTokenAddress,
    preferredRail: args.preferredRail,
    activeSettlementRail,
    x402Status,
    x402EndpointUrl: args.x402EndpointUrl,
    referenceCode,
    steps,
    warnings,
  };
}
