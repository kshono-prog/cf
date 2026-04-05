"use client";

import { useState } from "react";

import type { SerializedAiManagerPendingTimelineItem } from "@/lib/aiManager/pendingTimeline";

export type AiManagerPendingTimelineCardActions = {
  onConfirm: (paymentAttemptId: string, txHash: string, note?: string) => Promise<void>;
  onMarkFailed: (paymentAttemptId: string, note?: string) => Promise<void>;
  updating: boolean;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPendingAge(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "1分未満";
  if (minutes < 60) return `${minutes}分経過`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間経過`;
  return `${Math.floor(hours / 24)}日経過`;
}

const DELIVERY_STATUS_LABELS = {
  NONE: "pending なし",
  ACTIVE: "callback 待ち",
  WATCH: "やや滞留",
  STALE: "長時間滞留",
} as const;

const DELIVERY_STATUS_BADGE: Record<
  SerializedAiManagerPendingTimelineItem["deliveryStatus"],
  string
> = {
  NONE: "text-[var(--text-subtle)]",
  ACTIVE: "text-sky-700",
  WATCH: "text-amber-700",
  STALE: "text-red-700",
};

const CARD_BORDER: Record<
  SerializedAiManagerPendingTimelineItem["deliveryStatus"],
  string
> = {
  NONE: "border-[var(--line)] bg-[var(--surface)]",
  ACTIVE: "border-sky-200 bg-sky-50",
  WATCH: "border-amber-200 bg-amber-50",
  STALE: "border-red-200 bg-red-50",
};

export function AiManagerPendingTimelineCard({
  item,
  actions,
}: {
  item: SerializedAiManagerPendingTimelineItem;
  actions?: AiManagerPendingTimelineCardActions;
}) {
  const [mode, setMode] = useState<"confirm" | "mark-failed" | null>(null);
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");

  async function handleConfirmSubmit() {
    if (!actions || txHash.trim().length === 0) return;
    await actions.onConfirm(item.paymentAttemptId, txHash.trim(), note.trim() || undefined);
    setMode(null);
    setTxHash("");
    setNote("");
  }

  async function handleMarkFailedSubmit() {
    if (!actions) return;
    await actions.onMarkFailed(item.paymentAttemptId, note.trim() || undefined);
    setMode(null);
    setNote("");
  }

  return (
    <div
      className={`rounded-2xl border px-3 py-3 text-xs leading-5 ${CARD_BORDER[item.deliveryStatus]}`}
    >
      {/* ヘッダー: タスク名 + delivery status */}
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-[var(--text)]">
          {item.taskLabel ?? item.capabilityLabel}
        </div>
        <span
          className={`shrink-0 text-[11px] font-medium ${DELIVERY_STATUS_BADGE[item.deliveryStatus]}`}
        >
          {DELIVERY_STATUS_LABELS[item.deliveryStatus]}
        </span>
      </div>

      {/* メタ: 金額 + pending 経過時間 */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[var(--text-subtle)]">
        <span>
          {Number(item.amount).toLocaleString("ja-JP")} {item.currency}
        </span>
        <span aria-hidden>·</span>
        <span>{formatPendingAge(item.createdAt)}</span>
        <span className="text-[10px]">({formatDate(item.createdAt)} 開始)</span>
      </div>

      {/* イベントタイムライン (古い順) */}
      {item.events.length > 0 ? (
        <div className="mt-2">
          {item.events.map((ev, index) => {
            const isLast = index === item.events.length - 1;
            return (
              <div key={ev.id} className="flex items-start gap-2">
                {/* コネクター */}
                <div className="flex flex-col items-center self-stretch">
                  <div
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      isLast ? "bg-sky-500" : "bg-[var(--line)]"
                    }`}
                  />
                  {!isLast ? (
                    <div className="mt-0.5 w-px flex-1 bg-[var(--line)]" />
                  ) : null}
                </div>

                {/* イベント内容 */}
                <div className={`min-w-0 ${isLast ? "pb-0" : "pb-2"}`}>
                  <span className="font-medium text-[var(--text)]">
                    {ev.eventLabel}
                  </span>
                  {ev.pendingObservedCount !== null && ev.pendingObservedCount > 1 ? (
                    <span className="ml-1 text-[10px] text-[var(--text-subtle)]">
                      ×{ev.pendingObservedCount}
                    </span>
                  ) : null}
                  <span className="ml-2 text-[var(--text-subtle)]">{ev.sourceLabel}</span>
                  <span className="ml-2 text-[10px] text-[var(--text-subtle)]">
                    {formatDate(ev.createdAt)}
                  </span>
                  {ev.detail ? (
                    <div className="text-[10px] text-[var(--text-subtle)]">{ev.detail}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-[var(--text-subtle)]">イベント記録なし</div>
      )}

      {/* delivery hint */}
      {item.deliveryHint ? (
        <div className="mt-2 text-[var(--text-subtle)]">{item.deliveryHint}</div>
      ) : null}

      {/* インラインアクション */}
      {actions ? (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          {mode === null ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-3"
                onClick={() => setMode("confirm")}
                disabled={actions.updating}
              >
                確認する
              </button>
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-3"
                onClick={() => setMode("mark-failed")}
                disabled={actions.updating}
              >
                失敗として記録
              </button>
            </div>
          ) : mode === "confirm" ? (
            <div className="space-y-2">
              <div className="font-medium text-[var(--text)]">settlement tx hash を入力</div>
              <input
                type="text"
                className="input w-full text-xs"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                disabled={actions.updating}
              />
              <input
                type="text"
                className="input w-full text-xs"
                placeholder="note (任意)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                disabled={actions.updating}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-3"
                  onClick={() => void handleConfirmSubmit()}
                  disabled={actions.updating || txHash.trim().length === 0}
                >
                  {actions.updating ? "更新中..." : "確認を送信"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-3"
                  onClick={() => { setMode(null); setTxHash(""); setNote(""); }}
                  disabled={actions.updating}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-medium text-[var(--text)]">失敗として記録する</div>
              <input
                type="text"
                className="input w-full text-xs"
                placeholder="失敗理由 (任意)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                disabled={actions.updating}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-3"
                  onClick={() => void handleMarkFailedSubmit()}
                  disabled={actions.updating}
                >
                  {actions.updating ? "更新中..." : "失敗を記録"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-3"
                  onClick={() => { setMode(null); setNote(""); }}
                  disabled={actions.updating}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
