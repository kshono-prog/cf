"use client";

import React from "react";

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

export function ProjectSettlementDistributionDraftSection(
  props: ProjectSettlementDistributionDraftSectionProps
) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">配分の下書き</div>
          <div className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
            送金先と金額を先に整えてから、実行前チェックへ進みます。
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded border px-3 py-2 text-sm sm:w-auto sm:py-1.5 sm:text-xs"
          onClick={props.addDraftRow}
          disabled={props.loading}
        >
          行を追加
        </button>
      </div>

      <div className="space-y-1 text-[11px] leading-5 text-gray-600 sm:text-xs">
        合計: {formatBigIntGrouped(props.totals.planned)} / Bridge済み:{" "}
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
          <div
            key={`${row.id ?? "new"}-${index}`}
            className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-12 md:p-2"
          >
            <input
              className="rounded border px-3 py-2 text-sm font-mono md:col-span-4 md:px-2 md:py-1.5 md:text-xs"
              placeholder="送金先アドレス"
              value={row.recipientAddress}
              onChange={(e) =>
                props.updateDraft(index, { recipientAddress: e.target.value })
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm md:col-span-2 md:px-2 md:py-1.5 md:text-xs"
              placeholder="金額（atomic）"
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
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40 sm:w-auto"
        onClick={() => {
          void props.saveDistributions();
        }}
        disabled={props.loading || !props.walletAddress || props.totals.exceeds}
      >
        配分下書きを保存
      </button>
    </div>
  );
}
