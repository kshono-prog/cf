"use client";

import React from "react";

import { WorkspaceEmptyState, WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

type TokenPreflight = {
  token: CurrencyCode;
  requiredAtomic: bigint;
  walletBalanceAtomic: bigint | null;
  sufficient: boolean;
};

export type ProjectSettlementPreflightSectionProps = {
  loading: boolean;
  walletAddress: string | null;
  isConnected: boolean;
  preflight: TokenPreflight[];
  hasPreflightFailure: boolean;
  checkBalances: (mode?: "ALL" | "FAILED_ONLY") => Promise<unknown>;
};

export function ProjectSettlementPreflightSection(
  props: ProjectSettlementPreflightSectionProps
) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div>
          <div className="text-sm font-medium">送信前の確認</div>
          <div className="mt-1 text-[11px] leading-5 text-[var(--muted)] sm:text-xs">
            必要な残高と承認設定を確認してから、配分実行へ進みます。
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded border px-4 py-2 text-sm disabled:opacity-40 sm:w-auto"
          onClick={() => void props.checkBalances("ALL")}
          disabled={props.loading || !props.walletAddress || !props.isConnected}
        >
          送信前の確認を実行
        </button>
      </div>

      {props.preflight.length === 0 ? (
        <WorkspaceEmptyState
          title="まだ送信前の確認を実行していません"
          description="配分計画を保存したあとで確認を実行すると、必要残高や設定不足をまとめて確認できます。"
        />
      ) : (
        <div className="space-y-2 rounded border bg-[var(--surface-subtle)] p-3 text-[11px] leading-5 sm:p-2 sm:text-xs">
          {props.preflight.map((item) => (
            <div
              key={item.token}
              className="flex flex-col gap-1 rounded border border-[var(--line)] bg-[var(--surface)] p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <span className="font-semibold">{item.token}</span>
              <span>必要額: {item.requiredAtomic.toString()}</span>
              <span>
                現在残高:{" "}
                {item.walletBalanceAtomic === null
                  ? "N/A"
                  : item.walletBalanceAtomic.toString()}
              </span>
              <span
                className={`w-fit rounded border px-2 py-0.5 ${
                  item.sufficient
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-100"
                }`}
              >
                {item.sufficient ? "十分" : "不足"}
              </span>
            </div>
          ))}
        </div>
      )}

      {props.preflight.length > 0 ? (
        props.hasPreflightFailure ? (
          <WorkspaceStatusNotice
            tone="error"
            title="残高不足または承認設定の不足があります"
            description="不足している内容を確認し、修正後にもう一度送信前の確認を実行してください。"
          />
        ) : (
          <WorkspaceStatusNotice
            tone="success"
            title="送信前の確認が完了しました"
            description="残高と設定に問題がなければ、次の手順で配分を実行できます。"
          />
        )
      ) : null}
    </div>
  );
}
