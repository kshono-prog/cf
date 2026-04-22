"use client";

import type { PaymentIntentListItemView } from "@/lib/apiGuards/paymentIntents";
import type { PaymentIntentStatus } from "@/lib/paymentIntents";

type Props = {
  items: PaymentIntentListItemView[];
  loading: boolean;
  onOpenDetail: (id: string) => void;
};

const STATUS_STYLE: Record<PaymentIntentStatus, string> = {
  OPEN: "bg-slate-100 text-slate-700",
  PAID_PENDING: "bg-amber-100 text-amber-800",
  PAID_CONFIRMED: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-slate-100 text-slate-500",
  CANCELED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<PaymentIntentStatus, string> = {
  OPEN: "入金待ち",
  PAID_PENDING: "入金確認中",
  PAID_CONFIRMED: "入金確認済み",
  EXPIRED: "期限切れ",
  CANCELED: "中止",
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

function shortHash(v: string | null): string {
  if (!v) return "—";
  if (v.length <= 12) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

export function PaymentIntentList({ items, loading, onOpenDetail }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        支援受付を読み込み中…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        支援受付はまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((intent) => (
        <div
          key={intent.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
        >
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[intent.status]}`}
              >
                {STATUS_LABEL[intent.status]}
              </span>
              <span className="text-sm font-semibold text-[var(--text-strong)]">
                {intent.rewardTier?.title ?? "(メニュー未指定)"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-subtle)]">
              <span>数量 {intent.quantity}</span>
              <span>{formatJpyc(intent.expectedAmountJpyc)}</span>
              <span>chain {intent.chainId}</span>
              {intent.contribution ? (
                <span>txHash {shortHash(intent.contribution.txHash)}</span>
              ) : null}
              <span>
                受付: {new Date(intent.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenDetail(intent.id)}
            className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px]"
          >
            詳細
          </button>
        </div>
      ))}
    </div>
  );
}
