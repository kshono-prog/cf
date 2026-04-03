"use client";

import React from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import { formatBigIntGrouped } from "@/lib/numberFormat";

type DistributionDraftRow = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: CurrencyCode;
};

export type ProjectSettlementDistributionDraftSectionProps = {
  loading: boolean;
  walletAddress: string | null;
  rows: DistributionDraftRow[];
  aiDraftMessage: {
    tone: "info" | "success" | "error";
    text: string;
  } | null;
  canGenerateAiDraft: boolean;
  generateAiDraft: () => void;
  totals: {
    planned: bigint;
    bridged: bigint;
    exceeds: boolean;
  };
  draftDirty: boolean;
  addDraftRow: () => void;
  removeDraftRow: (index: number) => void;
  updateDraft: (
    index: number,
    patch: Partial<DistributionDraftRow>
  ) => void;
  saveDistributions: () => Promise<void>;
};

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidAmount(amount: string): boolean {
  if (!/^\d+$/.test(amount)) return false;
  try {
    return BigInt(amount) > 0n;
  } catch {
    return false;
  }
}

export function ProjectSettlementDistributionDraftSection(
  props: ProjectSettlementDistributionDraftSectionProps
) {
  const rowErrors = props.rows.map((row) => ({
    address:
      row.recipientAddress.length > 0 && !isValidAddress(row.recipientAddress)
        ? "有効な Ethereum アドレス（0x + 40桁）を入力してください"
        : null,
    amount:
      row.amountAtomic.length > 0 && !isValidAmount(row.amountAtomic)
        ? "0 より大きい整数を入力してください"
        : null,
  }));

  const hasErrors = rowErrors.some((e) => e.address !== null || e.amount !== null);

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <WorkspaceStatusNotice
        tone="info"
        title="この段階ではまだ送金されません。"
        description="ここでは送金先と金額を下書きして保存します。実際の送金は手順4で、送信前確認のあとに進めます。"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium">配分の下書き</div>
          <div className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
            送金先と金額を先に整えてから、送信前確認へ進みます。
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="w-full rounded border px-3 py-2 text-sm sm:w-auto sm:py-1.5 sm:text-xs"
            onClick={props.generateAiDraft}
            disabled={props.loading || !props.canGenerateAiDraft}
            title={
              props.canGenerateAiDraft
                ? ""
                : "先に投稿サマリーを取得してください"
            }
          >
            AIの提案を使う
          </button>
          <button
            type="button"
            className="w-full rounded border px-3 py-2 text-sm sm:w-auto sm:py-1.5 sm:text-xs"
            onClick={props.addDraftRow}
            disabled={props.loading}
          >
            行を追加
          </button>
        </div>
      </div>

      {props.aiDraftMessage ? (
        <WorkspaceStatusNotice
          tone={props.aiDraftMessage.tone}
          title={props.aiDraftMessage.text}
        />
      ) : null}

      <div className="space-y-1 text-[11px] leading-5 text-gray-600 sm:text-xs">
        合計: {formatBigIntGrouped(props.totals.planned)} / ブリッジ済み:{" "}
        {formatBigIntGrouped(props.totals.bridged)}
        {props.totals.exceeds ? (
          <span className="text-rose-700 ml-2">(超過しています)</span>
        ) : null}
        {props.draftDirty ? (
          <span className="text-amber-700 ml-2">未保存の変更があります</span>
        ) : null}
      </div>

      <div className="space-y-2">
        {props.rows.map((row, index) => (
          <div key={`${row.id ?? "new"}-${index}`} className="space-y-1">
            <div className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-12 md:p-2">
              <input
                className={`rounded border px-3 py-2 text-sm font-mono md:col-span-4 md:px-2 md:py-1.5 md:text-xs ${
                  rowErrors[index]?.address ? "border-rose-400" : ""
                }`}
                placeholder="送金先アドレス (0x...)"
                value={row.recipientAddress}
                onChange={(e) =>
                  props.updateDraft(index, { recipientAddress: e.target.value })
                }
              />
              <input
                className={`rounded border px-3 py-2 text-sm md:col-span-2 md:px-2 md:py-1.5 md:text-xs ${
                  rowErrors[index]?.amount ? "border-rose-400" : ""
                }`}
                placeholder="金額（最小単位）"
                value={row.amountAtomic}
                onChange={(e) =>
                  props.updateDraft(index, { amountAtomic: e.target.value })
                }
                inputMode="numeric"
              />
              <select
                className="rounded border bg-gray-50 px-3 py-2 text-sm md:col-span-2 md:px-2 md:py-1.5 md:text-xs"
                value={row.token}
                disabled
                aria-label="token"
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                className="rounded border px-3 py-2 text-sm md:col-span-3 md:px-2 md:py-1.5 md:text-xs"
                placeholder="メモ"
                value={row.memo}
                onChange={(e) => props.updateDraft(index, { memo: e.target.value })}
              />
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm md:col-span-1 md:px-2 md:py-1.5 md:text-xs"
                onClick={() => props.removeDraftRow(index)}
              >
                削除
              </button>
            </div>
            {rowErrors[index]?.address ? (
              <p className="text-[11px] text-rose-600 px-1">
                {rowErrors[index].address}
              </p>
            ) : null}
            {rowErrors[index]?.amount ? (
              <p className="text-[11px] text-rose-600 px-1">
                {rowErrors[index].amount}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn w-full disabled:opacity-40 sm:w-auto"
        onClick={() => {
          void props.saveDistributions();
        }}
        disabled={
          props.loading ||
          !props.walletAddress ||
          props.totals.exceeds ||
          hasErrors
        }
      >
        配分下書きを保存
      </button>
    </div>
  );
}
