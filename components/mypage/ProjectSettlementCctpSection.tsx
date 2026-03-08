"use client";

import React from "react";

import type { ProjectSettlementData } from "@/lib/projectSettlementView";

type CctpJob = ProjectSettlementData["cctpJobs"][number];
type CctpAction =
  | "SYNC_FROM_GOAL"
  | "MARK_BURN_SUBMITTED"
  | "FETCH_ATTESTATION"
  | "MARK_MINT_SUBMITTED"
  | "COMPLETE"
  | "FAIL"
  | "RETRY";

export type ProjectSettlementCctpSectionProps = {
  loading: boolean;
  walletAddress: string | null;
  cctpJobs: CctpJob[];
  onRunAction: (action: CctpAction, payload: Record<string, unknown>) => Promise<void>;
};

export function ProjectSettlementCctpSection(
  props: ProjectSettlementCctpSectionProps
) {
  const { loading, walletAddress, cctpJobs, onRunAction } = props;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">CCTP Bridge Jobs (USDC)</div>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
          onClick={() => void onRunAction("SYNC_FROM_GOAL", {})}
          disabled={loading || !walletAddress}
        >
          Goalからジョブ同期
        </button>
      </div>

      {cctpJobs.length === 0 ? (
        <div className="text-xs text-gray-500">
          CCTPジョブはまだありません（Goal達成後に生成されます）
        </div>
      ) : (
        <div className="space-y-2">
          {cctpJobs.map((job) => (
            <details key={job.id} className="rounded border p-2">
              <summary className="cursor-pointer text-xs flex flex-wrap items-center gap-2">
                <span className="font-mono">{job.id.slice(0, 10)}...</span>
                <span className="px-2 py-0.5 rounded bg-gray-100">
                  {job.status}
                </span>
                <span>
                  {job.sourceChain} → {job.destinationChain}
                </span>
                <span>
                  attempts: {job.attempts}/{job.maxAttempts}
                </span>
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                <div>burnTx: {job.burnTxHash ?? "N/A"}</div>
                <div>messageHash: {job.burnMessageHash ?? "N/A"}</div>
                <div>
                  attestation:{" "}
                  {job.attestation ? `${job.attestation.slice(0, 18)}...` : "N/A"}
                </div>
                <div>mintTx: {job.mintTxHash ?? "N/A"}</div>
                {job.failureReason ? (
                  <div className="text-rose-700">error: {job.failureReason}</div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() => {
                      const burnTxHash = window.prompt(
                        "burn tx hash",
                        job.burnTxHash ?? ""
                      );
                      if (!burnTxHash) return;
                      const burnAmountAtomic = window.prompt(
                        "burn amount atomic",
                        job.burnAmountAtomic ?? "0"
                      );
                      if (!burnAmountAtomic) return;
                      const burnMessageHash = window.prompt(
                        "burn message hash (0x...)",
                        job.burnMessageHash ?? ""
                      );
                      void onRunAction("MARK_BURN_SUBMITTED", {
                        jobId: job.id,
                        sourceChain: job.sourceChain,
                        burnTxHash,
                        burnAmountAtomic,
                        burnMessageHash: burnMessageHash || undefined,
                      });
                    }}
                    disabled={loading}
                  >
                    Burn記録
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() =>
                      void onRunAction("FETCH_ATTESTATION", {
                        jobId: job.id,
                        burnMessageHash: job.burnMessageHash ?? undefined,
                      })
                    }
                    disabled={loading}
                  >
                    Attestation取得
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() => {
                      const mintTxHash = window.prompt(
                        "mint tx hash",
                        job.mintTxHash ?? ""
                      );
                      if (!mintTxHash) return;
                      void onRunAction("MARK_MINT_SUBMITTED", {
                        jobId: job.id,
                        mintTxHash,
                      });
                    }}
                    disabled={loading}
                  >
                    Mint記録
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() =>
                      void onRunAction("COMPLETE", {
                        jobId: job.id,
                        mintTxHash: job.mintTxHash ?? undefined,
                      })
                    }
                    disabled={loading}
                  >
                    完了確定
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() => {
                      const reason = window.prompt(
                        "failure reason",
                        job.failureReason ?? "MANUAL_FAILED"
                      );
                      void onRunAction("FAIL", {
                        jobId: job.id,
                        failureReason: reason || "MANUAL_FAILED",
                      });
                    }}
                    disabled={loading}
                  >
                    失敗記録
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() => void onRunAction("RETRY", { jobId: job.id })}
                    disabled={loading || job.status !== "FAILED"}
                  >
                    再試行
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
