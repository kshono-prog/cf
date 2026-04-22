/* lib/apiGuards/paymentIntents.ts */
import type { PaymentIntentStatus } from "@/lib/paymentIntents";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStatus(v: unknown): PaymentIntentStatus {
  if (
    v === "OPEN" ||
    v === "PAID_PENDING" ||
    v === "PAID_CONFIRMED" ||
    v === "EXPIRED" ||
    v === "CANCELED"
  ) {
    return v;
  }
  return "OPEN";
}

export type PaymentIntentListItemView = {
  id: string;
  status: PaymentIntentStatus;
  rewardTier: { id: string; title: string } | null;
  expectedAmountJpyc: number;
  currency: string;
  chainId: number;
  quantity: number;
  customerLabel: string | null;
  contribution: {
    id: string;
    status: string;
    txHash: string | null;
    confirmedAt: string | null;
  } | null;
  createdAt: string;
  expiresAt: string | null;
};

export function parsePaymentIntentListItem(
  input: unknown
): PaymentIntentListItemView | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const createdAt = asString(input.createdAt);
  if (!id || !createdAt) return null;
  const tier = isRecord(input.rewardTier) ? input.rewardTier : null;
  const tierId = tier ? asString(tier.id) : null;
  const tierTitle = tier ? asString(tier.title) : null;
  const contribution = isRecord(input.contribution) ? input.contribution : null;
  const contributionId = contribution ? asString(contribution.id) : null;

  return {
    id,
    status: asStatus(input.status),
    rewardTier:
      tierId && tierTitle ? { id: tierId, title: tierTitle } : null,
    expectedAmountJpyc: asNumber(input.expectedAmountJpyc, 0),
    currency: asString(input.currency) ?? "JPYC",
    chainId: asNumber(input.chainId, 0),
    quantity: asNumber(input.quantity, 1),
    customerLabel: asNullableString(input.customerLabel),
    contribution:
      contribution && contributionId
        ? {
            id: contributionId,
            status: asString(contribution.status) ?? "PENDING",
            txHash: asNullableString(contribution.txHash),
            confirmedAt: asNullableString(contribution.confirmedAt),
          }
        : null,
    createdAt,
    expiresAt: asNullableString(input.expiresAt),
  };
}

export function parsePaymentIntentListResponse(
  input: unknown
): PaymentIntentListItemView[] {
  if (!isRecord(input)) return [];
  const items = input.items;
  if (!Array.isArray(items)) return [];
  const results: PaymentIntentListItemView[] = [];
  for (const raw of items) {
    const parsed = parsePaymentIntentListItem(raw);
    if (parsed) results.push(parsed);
  }
  return results;
}

export type PaymentIntentDetailView = PaymentIntentListItemView & {
  recipientAddress: string;
  note: string | null;
  purposeId: string | null;
  items: Array<{
    id: string;
    itemName: string;
    unitPriceJpyc: number;
    quantity: number;
    subtotalJpyc: number;
  }>;
};

export function parsePaymentIntentDetailResponse(
  input: unknown
): PaymentIntentDetailView | null {
  if (!isRecord(input)) return null;
  const payload = input.paymentIntent;
  if (!isRecord(payload)) return null;
  const base = parsePaymentIntentListItem(payload);
  if (!base) return null;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((raw) => {
      if (!isRecord(raw)) return null;
      const id = asString(raw.id);
      const itemName = asString(raw.itemName);
      if (!id || !itemName) return null;
      return {
        id,
        itemName,
        unitPriceJpyc: asNumber(raw.unitPriceJpyc, 0),
        quantity: asNumber(raw.quantity, 1),
        subtotalJpyc: asNumber(raw.subtotalJpyc, 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return {
    ...base,
    recipientAddress: asString(payload.recipientAddress) ?? "",
    note: asNullableString(payload.note),
    purposeId: asNullableString(payload.purposeId),
    items,
  };
}
