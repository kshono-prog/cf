"use client";

import React from "react";

import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import { getCctpStatusLabel } from "@/lib/uxCopy";

type CctpJob = ProjectSettlementData["cctpJobs"][number];
type CctpAction =
  | "SYNC_FROM_GOAL"
  | "MARK_BURN_SUBMITTED"
  | "FETCH_ATTESTATION"
  | "MARK_MINT_SUBMITTED"
  | "COMPLETE"
  | "FAIL"
  | "RETRY";

function getCctpJobNotice(job: CctpJob): {
  tone: "success" | "error" | "info" | "attention";
  title: string;
  description: string;
} {
  switch (job.status) {
    case "PENDING":
      return {
        tone: "info",
        title: "まだ CCTP ジョブの進行待ちです。",
        description:
          "Burn 実行や関連情報がそろってから次の記録に進みます。外部で確認できていない内容はここで確定しません。",
      };
    case "BURN_SUBMITTED":
      return {
        tone: "info",
        title: "Burn は記録済みです。",
        description:
          "Burn Tx と message hash を確認し、必要なら Attestation 取得へ進みます。",
      };
    case "ATTESTATION_READY":
      return {
        tone: "attention",
        title: "Attestation は取得済みです。",
        description:
          "Mint の記録に進む前に、関連トランザクションと対象ジョブが一致しているか確認してください。",
      };
    case "MINT_SUBMITTED":
      return {
        tone: "attention",
        title: "Mint は記録済みです。",
        description:
          "Mint 結果を確認できたら完了確定へ進みます。未確認のまま完了にはしません。",
      };
    case "COMPLETED":
      return {
        tone: "success",
        title: "この CCTP ジョブは完了扱いです。",
        description:
          "記録済みの Burn / Mint 情報を確認できれば、このジョブで追加操作は不要です。",
      };
    case "FAILED":
      return {
        tone: "error",
        title: "この CCTP ジョブは失敗状態です。",
        description:
          job.failureReason
            ? `失敗理由を確認してから再試行してください: ${job.failureReason}`
            : "失敗理由を確認してから再試行してください。",
      };
  }
}

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
        <div className="text-sm font-medium">USDC ブリッジ管理（CCTP）</div>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
          onClick={() => void onRunAction("SYNC_FROM_GOAL", {})}
          disabled={loading || !walletAddress}
        >
          Goalからジョブ同期
        </button>
      </div>
      <WorkspaceStatusNotice
        tone="attention"
        title="ここは通常フローではなく、CCTP ジョブの管理用です。"
        description="Burn / Mint の記録や失敗処理は、外部で結果を確認できたときだけ進めます。通常の精算確認とは分けて扱います。"
      />

      {cctpJobs.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="CCTP ジョブはまだありません"
          description="USDC の目標達成後にジョブが生成されると、ここで状態を管理できます。"
        />
      ) : (
        <div className="space-y-2">
          {cctpJobs.map((job) => {
            const jobNotice = getCctpJobNotice(job);
            return (
              <details key={job.id} className="rounded border p-2">
                <summary className="cursor-pointer text-xs flex flex-wrap items-center gap-2">
                  <span className="font-mono">{job.id.slice(0, 10)}...</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-muted)]">
                    {getCctpStatusLabel(job.status)}
                  </span>
                  <span>
                    {job.sourceChain} → {job.destinationChain}
                  </span>
                  <span>
                    試行回数: {job.attempts}/{job.maxAttempts}
                  </span>
                </summary>
                <div className="mt-2 space-y-1 text-xs">
                  <WorkspaceStatusNotice
                    tone={jobNotice.tone}
                    title={jobNotice.title}
                    description={jobNotice.description}
                  />
                  <div>Burn Tx: {job.burnTxHash ?? "N/A"}</div>
                  <div>Message Hash: {job.burnMessageHash ?? "N/A"}</div>
                  <div>
                    Attestation:{" "}
                    {job.attestation ? `${job.attestation.slice(0, 18)}...` : "N/A"}
                  </div>
                  <div>Mint Tx: {job.mintTxHash ?? "N/A"}</div>
                  {job.failureReason && job.status !== "FAILED" ? (
                    <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800">
                      失敗理由: {job.failureReason}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      onClick={() => {
                        const burnTxHash = window.prompt(
                          "Burn Tx Hash を入力してください",
                          job.burnTxHash ?? ""
                        );
                        if (!burnTxHash) return;
                        const burnAmountAtomic = window.prompt(
                          "Burn 金額（atomic 単位）を入力してください",
                          job.burnAmountAtomic ?? "0"
                        );
                        if (!burnAmountAtomic) return;
                        const burnMessageHash = window.prompt(
                          "Burn Message Hash（0x...）を入力してください",
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
                          "Mint Tx Hash を入力してください",
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
                          "失敗理由を入力してください",
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
            );
          })}
        </div>
      )}
    </div>
  );
}
