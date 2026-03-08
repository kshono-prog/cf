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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">配分の下書き</div>
          <div className="mt-1 text-xs text-gray-500">
            送金先と金額を先に整えてから、実行前チェックへ進みます。
          </div>
        </div>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-xs"
          onClick={props.addDraftRow}
          disabled={props.loading}
        >
          行を追加
        </button>
      </div>

      <div className="text-xs text-gray-600">
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
            className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2"
          >
            <input
              className="md:col-span-4 rounded border px-2 py-1.5 text-xs font-mono"
              placeholder="送金先アドレス"
              value={row.recipientAddress}
              onChange={(e) =>
                props.updateDraft(index, { recipientAddress: e.target.value })
              }
            />
            <input
              className="md:col-span-2 rounded border px-2 py-1.5 text-xs"
              placeholder="金額（atomic）"
              value={row.amountAtomic}
              onChange={(e) =>
                props.updateDraft(index, { amountAtomic: e.target.value })
              }
              inputMode="numeric"
            />
            <select
              className="md:col-span-2 rounded border px-2 py-1.5 text-xs bg-gray-50"
              value={row.token}
              disabled
              aria-label="token"
            >
              <option value="JPYC">JPYC</option>
              <option value="USDC">USDC</option>
            </select>
            <input
              className="md:col-span-3 rounded border px-2 py-1.5 text-xs"
              placeholder="メモ"
              value={row.memo}
              onChange={(e) => props.updateDraft(index, { memo: e.target.value })}
            />
            <button
              type="button"
              className="md:col-span-1 rounded border px-2 py-1.5 text-xs"
              onClick={() => props.removeDraftRow(index)}
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
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
