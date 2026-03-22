"use client";

import React from "react";

import { BridgeWithWormholeOrManualButton } from "@/components/bridge/BridgeWithWormholeOrManualButton";
import type {
  CurrencyCode,
  SummaryResponseOk,
  UiMsg,
} from "@/lib/mypage/accountPageTypes";

export type SummaryActionsSectionProps = {
  localProjectId: string | null;
  summary: SummaryResponseOk | null;
  summaryLoading: boolean;
  msg: UiMsg | null;
  refreshSummary: () => Promise<void>;
  planText: string;
  setPlanText: React.Dispatch<React.SetStateAction<string>>;
  txHashesText: string;
  setTxHashesText: React.Dispatch<React.SetStateAction<string>>;
  currency: CurrencyCode;
  setCurrency: React.Dispatch<React.SetStateAction<CurrencyCode>>;
  distChainId: number;
  setDistChainId: React.Dispatch<React.SetStateAction<number>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  canSavePlan: boolean;
  canSaveDistResult: boolean;
  canBridge: boolean;
  isOwner: boolean;
  doSavePlan: () => Promise<void>;
  doSaveDistributionResult: () => Promise<void>;
  onBridged: () => Promise<void>;
};

function renderProgressText(summary: SummaryResponseOk): string {
  const unit = summary.project.currency ?? "JPYC";
  const current =
    summary.progress.confirmedAmount ?? summary.progress.confirmedTotal;
  const target = summary.progress.targetAmount;

  return `${current.toLocaleString()} / ${
    target != null ? target.toLocaleString() : "—"
  } ${unit} (${Math.floor(summary.progress.progressPct)}%)`;
}

export function SummaryActionsSection(props: SummaryActionsSectionProps) {
  function msgClass(kind: string) {
    if (kind === "error") return "alert-error";
    if (kind === "success") return "alert-ok";
    return "alert-info";
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="section-title">Summary / Actions</div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => void props.refreshSummary()}
            disabled={!props.localProjectId || props.summaryLoading}
            type="button"
          >
            {props.summaryLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!props.localProjectId ? (
        <p className="caption-text">Project 作成後に Summary を利用できます。</p>
      ) : (
        <>
          {props.msg && (
            <div className={msgClass(props.msg.kind)}>
              {props.msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="section-label">Project status</div>
              <div className="body-text">{props.summary?.project.status ?? "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="section-label">Progress</div>
              <div className="body-text">
                {props.summary ? renderProgressText(props.summary) : "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="section-label">Distribution plan (JSON)</div>
              <textarea
                className="input min-h-[140px] font-mono text-[12px]"
                value={props.planText}
                onChange={(e) => props.setPlanText(e.target.value)}
                disabled={!props.canSavePlan || props.summaryLoading}
                placeholder='{"recipients":[...]}'
              />
              <button
                className="btn"
                onClick={() => void props.doSavePlan()}
                disabled={!props.canSavePlan || props.summaryLoading}
                title={!props.isOwner ? "owner のみ保存できます" : ""}
                type="button"
              >
                Plan を保存
              </button>
            </div>

            <div className="space-y-1">
              <div className="section-label">Distribution result txHashes (JSON or lines)</div>
              <textarea
                className="input min-h-[140px] font-mono text-[12px]"
                value={props.txHashesText}
                onChange={(e) => props.setTxHashesText(e.target.value)}
                disabled={!props.canSaveDistResult || props.summaryLoading}
                placeholder='["0x...","0x..."]'
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="section-label">currency</div>
                  <select
                    className="input"
                    value={props.currency}
                    onChange={(e) =>
                      props.setCurrency(e.target.value as CurrencyCode)
                    }
                    disabled={!props.canSaveDistResult || props.summaryLoading}
                  >
                    <option value="JPYC">JPYC</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="section-label">chainId</div>
                  <input
                    className="input font-mono"
                    value={String(props.distChainId)}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value)) props.setDistChainId(value);
                    }}
                    disabled={!props.canSaveDistResult || props.summaryLoading}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="section-label">note (optional)</div>
                <input
                  className="input"
                  value={props.note}
                  onChange={(e) => props.setNote(e.target.value)}
                  disabled={!props.canSaveDistResult || props.summaryLoading}
                />
              </div>

              <button
                className="btn"
                onClick={() => void props.doSaveDistributionResult()}
                disabled={!props.canSaveDistResult || props.summaryLoading}
                title={!props.isOwner ? "owner のみ保存できます" : ""}
                type="button"
              >
                Distribution 結果を保存
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="ml-auto">
              {props.localProjectId ? (
                <BridgeWithWormholeOrManualButton
                  projectId={props.localProjectId}
                  currency={props.currency}
                  disabled={!props.canBridge}
                  onBridged={() => void props.onBridged()}
                />
              ) : null}
            </div>
          </div>

          {props.summary?.goal?.achievedAt && (
            <div className="caption-text">
              achievedAt:{" "}
              <span className="font-mono">{props.summary.goal.achievedAt}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
