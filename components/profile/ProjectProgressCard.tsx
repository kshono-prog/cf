"use client";

import React, { useMemo } from "react";
import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";

/** /api/projects/[projectId]/progress のチェーン別内訳行 */
export type ProgressByChainRow = {
  chainId: number;
  confirmedAmountDecimal: string | null;
  confirmedAmountJpyc: number;
};

export type ProjectProgressCardProps = {
  // 見た目
  headerColor: string;

  // タイトル/ステータス
  projectTitle: string | null;
  projectStatus: string | null;

  // Explorer URL
  profileAddressUrl: string;

  // 数値
  progressLoading: boolean;
  progressError: string | null;

  progressTotalYen: number | null;
  resolvedTargetYen: number | null; // progressTargetYen or projectGoalTargetYen

  progressConfirmedCount: number | null;
  goalAchievedAt: string | null;
  progressReached: boolean | null;

  // チェーン情報
  supportedJpycChainIds: number[];
  byChainJpyc: ProgressByChainRow[];

  // ボタン制御
  achieving: boolean;
  showManualAchieveButton: boolean;

  // Actions（ロジックは親）
  onRefresh: () => void;
  onAchieve: () => void;
};

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function chainLabel(chainId: number): string {
  const cfg = getChainConfig(chainId as SupportedChainId);
  return cfg?.shortName ?? `Chain(${chainId})`;
}

/**
 * チェーン別カラー（要望：Ethereum / Polygon / Avalanche を色分け）
 * - Ethereum: グレー
 * - Polygon: パープル
 * - Avalanche: レッド
 * ここはデザイン都合で変更OK（色を増やしたくなったら map を拡張）
 */
function chainColor(chainId: number): string {
  switch (chainId) {
    case 1: // Ethereum
      return "#64748b"; // slate-500
    case 137: // Polygon
      return "#7c3aed"; // violet-600
    case 43114: // Avalanche
      return "#ef4444"; // red-500
    default:
      return "#0ea5e9"; // sky-500 (fallback)
  }
}

export function ProjectProgressCard(props: ProjectProgressCardProps) {
  const {
    headerColor,
    projectTitle,
    projectStatus,
    profileAddressUrl,
    progressLoading,
    progressError,
    progressTotalYen,
    resolvedTargetYen,
    progressConfirmedCount,
    goalAchievedAt,
    progressReached,
    supportedJpycChainIds,
    byChainJpyc,
    achieving,
    showManualAchieveButton,
    onRefresh,
    onAchieve,
  } = props;

  const currentYen = progressTotalYen ?? 0;
  const targetYen = resolvedTargetYen ?? 0;
  const canShowBar = targetYen > 0;

  // チェーン別の “積み上げセグメント” を作る
  const segments = useMemo(() => {
    // supportedJpycChainIds の順で見せたい（APIが順序を持っている想定）
    const order =
      supportedJpycChainIds.length > 0
        ? supportedJpycChainIds
        : byChainJpyc.map((r) => r.chainId);

    const map = new Map<number, number>();
    for (const r of byChainJpyc) {
      const v =
        typeof r.confirmedAmountJpyc === "number" ? r.confirmedAmountJpyc : 0;
      if (!Number.isFinite(v) || v <= 0) continue;
      map.set(r.chainId, (map.get(r.chainId) ?? 0) + v);
    }

    const out: Array<{
      chainId: number;
      label: string;
      amountYen: number;
      pctOfTarget: number; // 目標に対してこのチェーンが占める %
      color: string;
    }> = [];

    for (const cid of order) {
      const amt = map.get(cid) ?? 0;
      if (amt <= 0) continue;
      out.push({
        chainId: cid,
        label: chainLabel(cid),
        amountYen: amt,
        pctOfTarget: canShowBar ? clampPct((amt / targetYen) * 100) : 0,
        color: chainColor(cid),
      });
    }

    // order に無い chainId が byChain に含まれていた場合も拾う
    for (const [cid, amt] of map.entries()) {
      if (order.includes(cid)) continue;
      out.push({
        chainId: cid,
        label: chainLabel(cid),
        amountYen: amt,
        pctOfTarget: canShowBar ? clampPct((amt / targetYen) * 100) : 0,
        color: chainColor(cid),
      });
    }

    return out;
  }, [byChainJpyc, supportedJpycChainIds, canShowBar, targetYen]);

  const totalPct = canShowBar ? clampPct((currentYen / targetYen) * 100) : 0;

  const chainsText =
    supportedJpycChainIds.length > 0
      ? supportedJpycChainIds.map(chainLabel).join(" / ")
      : "—";

  const reachedText = goalAchievedAt
    ? "達成確定済み"
    : progressReached === true
    ? "到達（未確定）"
    : progressReached === false
    ? "未達"
    : "—";

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-500">
              Project progress (DB / CONFIRMED)
            </div>

            <div className="mt-0.5 text-sm font-semibold text-gray-900 break-words">
              {projectTitle ?? "プロジェクト"}
            </div>

            <div className="mt-0.5 text-xs text-gray-600">
              {projectStatus ? `Status: ${projectStatus}` : "Status: -"}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-xs text-gray-500">JPYC</div>
            <div className="text-sm font-mono font-semibold text-gray-900">
              {progressLoading
                ? "Loading…"
                : `${currentYen.toLocaleString()} / ${targetYen.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Explorer */}
        {profileAddressUrl ? (
          <div className="mt-2 text-[11px] text-gray-500">
            <a
              className="underline hover:no-underline break-all"
              href={profileAddressUrl}
              target="_blank"
              rel="noreferrer"
            >
              Explorer
            </a>
          </div>
        ) : null}

        {/* Stacked progress bar (by chain) */}
        {canShowBar ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="flex h-full w-full">
                {segments.length > 0 ? (
                  segments.map((seg) => (
                    <div
                      key={String(seg.chainId)}
                      style={{
                        width: `${seg.pctOfTarget}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${
                        seg.label
                      }: ${seg.amountYen.toLocaleString()} JPYC`}
                    />
                  ))
                ) : (
                  <div style={{ width: "0%" }} />
                )}

                {/* 目標未達分の “残り” は背景（gray-200）として自然に見せるため、何も描画しない */}
              </div>
            </div>

            {/* row: total % + legend */}
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-600">
              <div>
                進捗:{" "}
                <span className="font-mono font-semibold text-gray-900">
                  {Math.floor(totalPct)}%
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {supportedJpycChainIds
                  .filter((cid) => [1, 137, 43114].includes(cid))
                  .map((cid) => (
                    <div key={String(cid)} className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded"
                        style={{ backgroundColor: chainColor(cid) }}
                      />
                      <span>{chainLabel(cid)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Meta + actions */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-600 space-y-1">
            <div>
              対象チェーン: <span className="text-gray-900">{chainsText}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                CONFIRMED tx:{" "}
                <span className="font-mono text-gray-900">
                  {progressConfirmedCount != null
                    ? progressConfirmedCount
                    : "-"}
                </span>
              </span>
              <span className="text-gray-400">|</span>
              <span>
                状態: <span className="text-gray-900">{reachedText}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={onRefresh}
              disabled={progressLoading || achieving}
            >
              更新
            </button>

            {showManualAchieveButton ? (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={onAchieve}
                disabled={achieving || progressLoading}
                style={{ borderColor: headerColor, color: headerColor }}
              >
                達成確定
              </button>
            ) : null}
          </div>
        </div>

        {/* Details (optional) */}
        <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-gray-700 select-none">
            チェーン別内訳（JPYC / CONFIRMED）
          </summary>

          <div className="mt-2">
            {byChainJpyc.length > 0 ? (
              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {byChainJpyc.map((r) => (
                  <div
                    key={String(r.chainId)}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded"
                        style={{ backgroundColor: chainColor(r.chainId) }}
                      />
                      <span className="text-[12px] text-gray-800">
                        {chainLabel(r.chainId)}
                      </span>
                    </div>

                    <div className="text-[12px] font-mono font-semibold text-gray-900">
                      {Number(r.confirmedAmountJpyc).toLocaleString()} JPYC
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500">内訳はありません</div>
            )}
          </div>
        </details>

        {/* Errors / hints */}
        {progressError ? (
          <div className="mt-2 text-[11px] text-rose-600 break-all">
            {progressError}
          </div>
        ) : null}

        {progressReached === true && !goalAchievedAt ? (
          <div className="mt-2 text-[11px] text-emerald-700">
            目標に到達しています。反映遅延がある場合は「達成確定」を押してください。
          </div>
        ) : null}

        {goalAchievedAt ? (
          <div className="mt-2 text-[11px] text-emerald-700">
            目標達成が確定済みです。
          </div>
        ) : null}
      </div>
    </div>
  );
}

// "use client";

// import React from "react";
// import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";

// /** /api/projects/[projectId]/progress のチェーン別内訳行 */
// export type ProgressByChainRow = {
//   chainId: number;
//   confirmedAmountDecimal: string | null;
//   confirmedAmountJpyc: number;
// };

// /** 全チェーン合算（参考表示） */
// export type ProgressTotalsAllChains = {
//   JPYC: string | null;
//   USDC: string | null;
// };

// export type ProjectProgressCardProps = {
//   // 見た目
//   headerColor: string;

//   // タイトル/ステータス
//   projectTitle: string | null;
//   projectStatus: string | null;

//   // Explorer（ProfileHeader のチェーンに依存する場合があるのでURLを渡す）
//   profileAddressUrl: string;

//   // 数値
//   progressLoading: boolean;
//   progressError: string | null;

//   progressTotalYen: number | null;
//   resolvedTargetYen: number | null; // progressTargetYen or projectGoalTargetYen
//   progressPercent: number | null;

//   progressConfirmedCount: number | null; // 現状は null のままでもOK
//   goalAchievedAt: string | null;
//   progressReached: boolean | null;

//   // 追加情報
//   supportedJpycChainIds: number[];
//   byChainJpyc: ProgressByChainRow[];
//   totalsAllChains: ProgressTotalsAllChains | null;

//   // ボタン制御
//   achieving: boolean;
//   showManualAchieveButton: boolean;

//   // Actions（ロジックは親に残す）
//   onRefresh: () => void;
//   onAchieve: () => void;
// };

// export function ProjectProgressCard(props: ProjectProgressCardProps) {
//   const {
//     headerColor,
//     projectTitle,
//     projectStatus,
//     profileAddressUrl,
//     progressLoading,
//     progressError,
//     progressTotalYen,
//     resolvedTargetYen,
//     progressPercent,
//     progressConfirmedCount,
//     goalAchievedAt,
//     progressReached,
//     supportedJpycChainIds,
//     byChainJpyc,
//     totalsAllChains,
//     achieving,
//     showManualAchieveButton,
//     onRefresh,
//     onAchieve,
//   } = props;

//   return (
//     <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
//       <div className="p-4">
//         <div className="flex justify-between items-start mb-2 gap-3">
//           <div className="min-w-0">
//             <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">
//               Project progress (DB / CONFIRMED)
//             </p>

//             {projectTitle ? (
//               <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 leading-snug break-words">
//                 {projectTitle}
//               </p>
//             ) : null}

//             <p className="text-sm font-medium text-gray-800 dark:text-gray-900">
//               {projectStatus ? `Status: ${projectStatus}` : "Status: -"}
//             </p>

//             {profileAddressUrl ? (
//               <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-600">
//                 Explorer:&nbsp;
//                 <a
//                   className="underline hover:no-underline break-all"
//                   href={profileAddressUrl}
//                   target="_blank"
//                   rel="noreferrer"
//                 >
//                   Explorer
//                 </a>
//               </p>
//             ) : null}
//           </div>

//           <div className="shrink-0 text-right text-xs text-gray-600 dark:text-gray-700">
//             {progressLoading ? (
//               <span>読み込み中… / Loading…</span>
//             ) : (
//               <>
//                 <span className="font-mono">
//                   {(progressTotalYen ?? 0).toLocaleString()}
//                 </span>
//                 {" / "}
//                 <span className="font-mono">
//                   {(resolvedTargetYen ?? 0).toLocaleString()}
//                 </span>
//                 <span className="ml-1">JPYC</span>
//               </>
//             )}
//           </div>
//         </div>

//         {progressPercent != null && (
//           <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
//             <div
//               className="h-full transition-all duration-500"
//               style={{
//                 backgroundColor: headerColor,
//                 width: `${progressPercent}%`,
//               }}
//             />
//           </div>
//         )}

//         {/* 合算 + 対象チェーン表示 */}
//         <div className="mt-2 rounded-2xl border border-gray-200/70 bg-gray-50/60 px-3 py-2">
//           <div className="flex items-start justify-between gap-3">
//             <div className="text-[11px] text-gray-600">
//               <div className="font-semibold text-gray-700">
//                 合算（JPYC / CONFIRMED）
//               </div>
//               <div className="mt-0.5">
//                 <span className="font-mono font-semibold text-gray-900">
//                   {(progressTotalYen ?? 0).toLocaleString()}
//                 </span>{" "}
//                 JPYC
//               </div>
//               <div className="mt-1 text-[10px] text-gray-500">
//                 ※ 合算対象: JPYC が設定されている対応チェーン（confirmed のみ）
//               </div>
//             </div>

//             <div className="text-[10px] text-gray-500 text-right">
//               {supportedJpycChainIds.length > 0 ? (
//                 <>
//                   <div className="font-semibold text-gray-600">
//                     対象チェーン
//                   </div>
//                   <div className="mt-0.5">
//                     {supportedJpycChainIds
//                       .map((id) => {
//                         const cfg = getChainConfig(id as SupportedChainId);
//                         return cfg?.shortName ?? `Chain(${id})`;
//                       })
//                       .join(" / ")}
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-gray-400">対象チェーン: -</div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Refresh / Achieve */}
//         <div className="mt-2 flex items-center justify-between gap-3">
//           <div className="text-[11px] text-gray-500 dark:text-gray-600">
//             {progressConfirmedCount != null ? (
//               <span>
//                 CONFIRMED tx:{" "}
//                 <span className="font-mono">{progressConfirmedCount}</span>
//               </span>
//             ) : (
//               <span>CONFIRMED tx: -</span>
//             )}
//             {goalAchievedAt && (
//               <span className="ml-2">
//                 AchievedAt:{" "}
//                 <span className="font-mono">{String(goalAchievedAt)}</span>
//               </span>
//             )}
//           </div>

//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               className="btn-secondary text-xs"
//               onClick={onRefresh}
//               disabled={progressLoading || achieving}
//             >
//               進捗を更新 / Refresh
//             </button>

//             {showManualAchieveButton && (
//               <button
//                 type="button"
//                 className="btn-secondary text-xs"
//                 onClick={onAchieve}
//                 disabled={achieving || progressLoading}
//                 style={{
//                   borderColor: headerColor,
//                   color: headerColor,
//                 }}
//               >
//                 目標達成を確定 / Achieve
//               </button>
//             )}
//           </div>
//         </div>

//         {/* チェーン別内訳 */}
//         <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
//           <div className="text-[11px] font-semibold text-gray-700">
//             合算対象（JPYC / CONFIRMED）
//           </div>

//           <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
//             本アプリが対応するチェーンのうち、JPYC
//             が登録されているチェーンのみを合算します（CONFIRMED のみ）。
//             対象チェーンは API の{" "}
//             <span className="font-mono">supportedJpycChainIds</span>{" "}
//             と一致します。
//           </div>

//           <div className="mt-2 text-[11px] text-gray-600">
//             合算（JPYC / CONFIRMED）:{" "}
//             <span className="font-mono font-semibold text-gray-900">
//               {(progressTotalYen ?? 0).toLocaleString()}
//             </span>{" "}
//             JPYC
//           </div>

//           <div className="mt-2 text-[10px] text-gray-500">
//             対象チェーン:{" "}
//             {supportedJpycChainIds.length > 0
//               ? supportedJpycChainIds
//                   .map((id) => {
//                     const cfg = getChainConfig(id as SupportedChainId);
//                     return cfg?.shortName ?? `Chain(${id})`;
//                   })
//                   .join(" / ")
//               : "-"}
//           </div>

//           {byChainJpyc.length > 0 ? (
//             <div className="mt-2 space-y-1">
//               <div className="text-[11px] text-gray-500">チェーン別内訳</div>

//               <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
//                 {byChainJpyc.map((r) => {
//                   const cfg = getChainConfig(r.chainId as SupportedChainId);
//                   const label = cfg?.shortName ?? `Chain(${r.chainId})`;
//                   return (
//                     <div
//                       key={String(r.chainId)}
//                       className="flex items-center justify-between px-3 py-2"
//                     >
//                       <div className="text-[12px] text-gray-800">{label}</div>
//                       <div className="text-[12px] font-mono font-semibold text-gray-900">
//                         {Number(r.confirmedAmountJpyc).toLocaleString()} JPYC
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               {totalsAllChains ? (
//                 <div className="mt-2 text-[11px] text-gray-500">
//                   参考（全チェーン合算 / CONFIRMED）:{" "}
//                   <span className="font-mono">
//                     JPYC {totalsAllChains.JPYC ?? "0"} / USDC{" "}
//                     {totalsAllChains.USDC ?? "0"}
//                   </span>
//                 </div>
//               ) : null}
//             </div>
//           ) : (
//             <div className="mt-2 text-[11px] text-gray-500">
//               チェーン別内訳はありません（CONFIRMED
//               が無い、または集計対象外の可能性があります）
//             </div>
//           )}
//         </div>

//         {progressError && (
//           <p className="mt-2 text-[11px] text-rose-600 break-all">
//             {progressError}
//           </p>
//         )}

//         {progressReached === true && !goalAchievedAt && (
//           <p className="mt-2 text-[11px] text-emerald-700">
//             目標金額に到達しています。送金後は自動で達成確定を試行します（反映遅延がある場合は「Achieve」を押してください）。
//           </p>
//         )}

//         {goalAchievedAt && (
//           <p className="mt-2 text-[11px] text-emerald-700">
//             目標達成が確定済みです。
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }
