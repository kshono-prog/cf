"use client";

import type { SerializedConnectorHealthDigest } from "@/lib/aiManager/connectorHealthDigest";

function formatCheckInAge(minutesSinceLastCheckIn: number | null): string {
  if (minutesSinceLastCheckIn === null) return "check-in なし";
  if (minutesSinceLastCheckIn < 1) return "1分未満前";
  if (minutesSinceLastCheckIn < 60) return `${minutesSinceLastCheckIn}分前`;
  const hours = Math.floor(minutesSinceLastCheckIn / 60);
  return `${hours}時間前`;
}

export function AiManagerConnectorHealthDigest({
  digest,
}: {
  digest: SerializedConnectorHealthDigest;
}) {
  const hasPending =
    digest.pendingActive + digest.pendingWatch + digest.pendingStale > 0;
  const hasActivity =
    hasPending ||
    digest.duplicateReplayCount > 0 ||
    digest.pendingObservedTotalCount > 0;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        Connector Health
      </div>

      {!hasActivity ? (
        <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
          現在 pending な x402 settlement はなく、connector check-in の記録もありません。
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {/* pending 件数内訳 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-sky-800">{digest.pendingActive}</div>
              <div className="text-[10px] text-sky-700">callback 待ち</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-amber-800">{digest.pendingWatch}</div>
              <div className="text-[10px] text-amber-700">やや滞留</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-red-800">{digest.pendingStale}</div>
              <div className="text-[10px] text-red-700">長時間滞留</div>
            </div>
          </div>

          {/* connector check-in & replay */}
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-subtle)]">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="font-medium text-[var(--text)]">最終 check-in</div>
              <div className="mt-0.5">
                {formatCheckInAge(digest.minutesSinceLastCheckIn)}
              </div>
              <div className="text-[10px]">
                観測 {digest.pendingObservedTotalCount} 件
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="font-medium text-[var(--text)]">重複 replay 受理</div>
              <div className="mt-0.5">{digest.duplicateReplayCount} 件</div>
              <div className="text-[10px]">直近イベント内</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
