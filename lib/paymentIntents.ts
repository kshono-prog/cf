/* lib/paymentIntents.ts
 *
 * PaymentIntent の status 解決と DTO 変換ユーティリティ。純関数。
 */

export type PaymentIntentStatus =
  | "OPEN"
  | "PAID_PENDING"
  | "PAID_CONFIRMED"
  | "EXPIRED"
  | "CANCELED";

export function isPaymentIntentStatus(
  value: unknown
): value is PaymentIntentStatus {
  return (
    value === "OPEN" ||
    value === "PAID_PENDING" ||
    value === "PAID_CONFIRMED" ||
    value === "EXPIRED" ||
    value === "CANCELED"
  );
}

type ContributionLite = {
  id: string;
  status: string;
  txHash: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  confirmedAt: Date | null;
};

type RewardTierLite = {
  id: bigint | string;
  title: string;
  priceJpyc: number;
  currency: string;
  productionStatus: string;
};

export function resolvePaymentIntentStatus(args: {
  contribution: ContributionLite | null;
  storedStatus: string;
  expiresAt: Date | null;
  canceledAt: Date | null;
  now?: Date;
}): PaymentIntentStatus {
  if (args.canceledAt) return "CANCELED";
  if (args.storedStatus === "CANCELED") return "CANCELED";

  if (args.contribution) {
    if (args.contribution.status === "CONFIRMED") return "PAID_CONFIRMED";
    return "PAID_PENDING";
  }

  const now = args.now ?? new Date();
  if (args.expiresAt && args.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  return "OPEN";
}

export type PaymentIntentDraftInput = {
  rewardTier: {
    id: bigint;
    priceJpyc: number;
    currency: string;
    title: string;
  };
  quantity: number;
  chainId: number;
  recipientAddress: string;
  currency: string;
  customerLabel?: string | null;
  note?: string | null;
  purposeId?: bigint | null;
  expiresAt?: Date | null;
};

export type PaymentIntentDraft = {
  projectLinkedTierId: bigint;
  expectedAmountJpyc: number;
  quantity: number;
  chainId: number;
  currency: string;
  recipientAddress: string;
  customerLabel: string | null;
  note: string | null;
  purposeId: bigint | null;
  expiresAt: Date | null;
  itemName: string;
  unitPriceJpyc: number;
  subtotalJpyc: number;
};

export function createPaymentIntentDraft(
  args: PaymentIntentDraftInput
): PaymentIntentDraft {
  const quantity =
    Number.isFinite(args.quantity) && args.quantity > 0
      ? Math.floor(args.quantity)
      : 1;
  const unitPrice = Math.max(0, Math.floor(args.rewardTier.priceJpyc));
  const subtotal = unitPrice * quantity;

  return {
    projectLinkedTierId: args.rewardTier.id,
    expectedAmountJpyc: subtotal,
    quantity,
    chainId: args.chainId,
    currency: args.currency,
    recipientAddress: args.recipientAddress,
    customerLabel: args.customerLabel ?? null,
    note: args.note ?? null,
    purposeId: args.purposeId ?? null,
    expiresAt: args.expiresAt ?? null,
    itemName: args.rewardTier.title,
    unitPriceJpyc: unitPrice,
    subtotalJpyc: subtotal,
  };
}

export type PaymentIntentListItem = {
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

export function toPaymentIntentListItem(args: {
  id: string;
  projectId: bigint;
  storedStatus: string;
  expectedAmountJpyc: number;
  currency: string;
  chainId: number;
  quantity: number;
  customerLabel: string | null;
  expiresAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  rewardTier: RewardTierLite | null;
  contribution: ContributionLite | null;
  now?: Date;
}): PaymentIntentListItem {
  const status = resolvePaymentIntentStatus({
    contribution: args.contribution,
    storedStatus: args.storedStatus,
    expiresAt: args.expiresAt,
    canceledAt: args.canceledAt,
    now: args.now,
  });
  return {
    id: args.id,
    status,
    rewardTier: args.rewardTier
      ? {
          id: String(args.rewardTier.id),
          title: args.rewardTier.title,
        }
      : null,
    expectedAmountJpyc: args.expectedAmountJpyc,
    currency: args.currency,
    chainId: args.chainId,
    quantity: args.quantity,
    customerLabel: args.customerLabel,
    contribution: args.contribution
      ? {
          id: args.contribution.id,
          status: args.contribution.status,
          txHash: args.contribution.txHash,
          confirmedAt: args.contribution.confirmedAt
            ? args.contribution.confirmedAt.toISOString()
            : null,
        }
      : null,
    createdAt: args.createdAt.toISOString(),
    expiresAt: args.expiresAt ? args.expiresAt.toISOString() : null,
  };
}

export type PaymentIntentDetailItem = {
  id: string;
  itemName: string;
  unitPriceJpyc: number;
  quantity: number;
  subtotalJpyc: number;
};

export type PaymentIntentDetailDto = PaymentIntentListItem & {
  recipientAddress: string;
  note: string | null;
  purposeId: string | null;
  items: PaymentIntentDetailItem[];
};

export function toPaymentIntentDetailDto(args: {
  id: string;
  projectId: bigint;
  storedStatus: string;
  expectedAmountJpyc: number;
  currency: string;
  chainId: number;
  quantity: number;
  customerLabel: string | null;
  recipientAddress: string;
  note: string | null;
  purposeId: bigint | null;
  expiresAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  rewardTier: RewardTierLite | null;
  contribution: ContributionLite | null;
  items: Array<{
    id: string;
    itemName: string;
    unitPriceJpyc: number;
    quantity: number;
    subtotalJpyc: number;
  }>;
  now?: Date;
}): PaymentIntentDetailDto {
  const base = toPaymentIntentListItem(args);
  return {
    ...base,
    recipientAddress: args.recipientAddress,
    note: args.note,
    purposeId: args.purposeId ? args.purposeId.toString() : null,
    items: args.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      unitPriceJpyc: i.unitPriceJpyc,
      quantity: i.quantity,
      subtotalJpyc: i.subtotalJpyc,
    })),
  };
}
