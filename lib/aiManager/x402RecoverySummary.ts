import { deriveAiManagerX402RecoveryItems } from "@/lib/aiManager/x402Recovery";
import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";

export type SerializedAiManagerX402RecoverySummary = {
  count: number;
  latestRecoveryLabel: string | null;
  latestSourceLabel: string | null;
  latestCreatedAt: string | null;
  connectorCount: number;
  ownerReviewCount: number;
  billingSystemCount: number;
  /** 直近24h の recovery 件数 */
  last24hCount: number;
  /** その前24h（24〜48h前）の recovery 件数 */
  prior24hCount: number;
  /** 直近24h と前日比較のトレンド */
  recentTrend: "increasing" | "stable" | "none";
};

export function deriveAiManagerX402RecoverySummary(
  account: Pick<SerializedAiManagerAccount, "recentPaymentAttemptEvents"> | null
): SerializedAiManagerX402RecoverySummary {
  const items = deriveAiManagerX402RecoveryItems(account);
  const latest = items[0] ?? null;

  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const cutoff24h = new Date(now - ms24h).toISOString();
  const cutoff48h = new Date(now - 2 * ms24h).toISOString();

  const last24hCount = items.filter((item) => item.createdAt >= cutoff24h).length;
  const prior24hCount = items.filter(
    (item) => item.createdAt >= cutoff48h && item.createdAt < cutoff24h
  ).length;

  const recentTrend: SerializedAiManagerX402RecoverySummary["recentTrend"] =
    last24hCount === 0 && prior24hCount === 0
      ? "none"
      : last24hCount > prior24hCount
        ? "increasing"
        : "stable";

  return {
    count: items.length,
    latestRecoveryLabel: latest?.recoveryLabel ?? null,
    latestSourceLabel: latest?.sourceLabel ?? null,
    latestCreatedAt: latest?.createdAt ?? null,
    connectorCount: items.filter((item) => item.sourceLabel === "x402 connector")
      .length,
    ownerReviewCount: items.filter((item) => item.sourceLabel === "owner review")
      .length,
    billingSystemCount: items.filter((item) => item.sourceLabel === "billing system")
      .length,
    last24hCount,
    prior24hCount,
    recentTrend,
  };
}
