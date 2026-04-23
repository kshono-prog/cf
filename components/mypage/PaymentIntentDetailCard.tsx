"use client";

import type { PaymentIntentDetailView } from "@/lib/apiGuards/paymentIntents";

type Props = {
  intent: PaymentIntentDetailView;
  reverifying: boolean;
  canceling?: boolean;
  onReverify: () => void;
  onCancel?: () => void;
  onClose: () => void;
  message?: string | null;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function PaymentIntentDetailCard({
  intent,
  reverifying,
  canceling,
  onReverify,
  onCancel,
  onClose,
  message,
}: Props) {
  const cancelable =
    !intent.contribution &&
    (intent.status === "OPEN" || intent.status === "EXPIRED");
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
            支援受付 詳細
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
            {intent.rewardTier?.title ?? "(メニュー未指定)"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-[var(--text-subtle)] underline"
        >
          閉じる
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-[10px] text-[var(--text-subtle)]">合計</div>
          <div className="text-sm font-semibold text-[var(--text-strong)]">
            {formatJpyc(intent.expectedAmountJpyc)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--text-subtle)]">数量</div>
          <div className="text-sm text-[var(--text-strong)]">
            {intent.quantity}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--text-subtle)]">chainId</div>
          <div className="text-sm text-[var(--text-strong)]">
            {intent.chainId}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--text-subtle)]">通貨</div>
          <div className="text-sm text-[var(--text-strong)]">
            {intent.currency}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-[10px] text-[var(--text-subtle)]">受取先</div>
          <div className="break-all text-[12px] text-[var(--text-strong)]">
            {intent.recipientAddress}
          </div>
        </div>
        {intent.customerLabel ? (
          <div className="col-span-2">
            <div className="text-[10px] text-[var(--text-subtle)]">ラベル</div>
            <div className="text-[12px] text-[var(--text-strong)]">
              {intent.customerLabel}
            </div>
          </div>
        ) : null}
        {intent.note ? (
          <div className="col-span-2">
            <div className="text-[10px] text-[var(--text-subtle)]">メモ</div>
            <div className="text-[12px] text-[var(--text-strong)]">
              {intent.note}
            </div>
          </div>
        ) : null}
      </section>

      {intent.items.length > 0 ? (
        <section>
          <div className="text-[10px] text-[var(--text-subtle)]">項目</div>
          <ul className="mt-1 space-y-1">
            {intent.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-[11px]"
              >
                <span>
                  {item.itemName} × {item.quantity}
                </span>
                <span>{formatJpyc(item.subtotalJpyc)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-[var(--text-subtle)]">
        <div className="flex justify-between">
          <span>ステータス</span>
          <span className="font-semibold text-[var(--text-strong)]">
            {intent.status}
          </span>
        </div>
        {intent.contribution ? (
          <>
            <div className="flex justify-between">
              <span>contribution</span>
              <span>{intent.contribution.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>txHash</span>
              <span className="break-all text-right">
                {intent.contribution.txHash ?? "—"}
              </span>
            </div>
            {intent.contribution.confirmedAt ? (
              <div className="flex justify-between">
                <span>入金確認</span>
                <span>
                  {new Date(
                    intent.contribution.confirmedAt
                  ).toLocaleString()}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <div>入金 tx はまだ紐付いていません。</div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        {message ? (
          <span className="text-[11px] text-[var(--text-subtle)]">{message}</span>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={!cancelable || canceling}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              cancelable
                ? "入金が紐づく前の受付を中止します"
                : "入金済みの受付は中止できません"
            }
          >
            {canceling ? "中止処理中…" : "受付を中止"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onReverify}
          disabled={reverifying || !intent.contribution}
          className="rounded-md bg-[var(--accent,#2563eb)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {reverifying ? "再検証中…" : "再検証"}
        </button>
      </div>
    </div>
  );
}
