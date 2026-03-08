"use client";

import React from "react";

import { getBridgeStepStatusLabel, getSettlementMessage } from "@/lib/uxCopy";

type BridgeSourceChain = "POLYGON" | "ETHEREUM";

type BridgeCardProps = {
  title: string;
  done: boolean;
  amount: string;
  txHash: string;
  loading: boolean;
  walletAddress: string | null;
  bridgeNowBusy: boolean;
  bridgeNowStatus?: string;
  onChangeAmount: (value: string) => void;
  onChangeTxHash: (value: string) => void;
  onRecord: () => void;
  onRunNow: () => void;
};

function BridgeCard(props: BridgeCardProps) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-sm font-medium">{props.title}</div>
      <a
        href="https://portalbridge.com/"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 underline"
      >
        推奨ブリッジを開く（Wormhole）
      </a>
      <div className="text-xs">
        状態: {getBridgeStepStatusLabel(props.done ? "COMPLETED" : "PENDING")}
      </div>
      <input
        className="w-full rounded border px-2 py-1.5 text-xs"
        placeholder="ブリッジ済み金額（atomic 単位）"
        value={props.amount}
        onChange={(e) => props.onChangeAmount(e.target.value)}
        inputMode="numeric"
      />
      <input
        className="w-full rounded border px-2 py-1.5 text-xs font-mono"
        placeholder="txHash（任意）"
        value={props.txHash}
        onChange={(e) => props.onChangeTxHash(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-black text-white px-3 py-1.5 text-xs disabled:opacity-40"
        onClick={props.onRecord}
        disabled={props.loading || !props.walletAddress}
      >
        完了を記録
      </button>
      <button
        type="button"
        className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
        onClick={props.onRunNow}
        disabled={props.loading || !props.walletAddress || props.bridgeNowBusy}
      >
        {props.bridgeNowBusy ? "ウォレットで実行中..." : "ウォレットで実行する"}
      </button>
      {props.bridgeNowStatus ? (
        <div className="text-[11px] text-gray-600 break-all">
          {getSettlementMessage(props.bridgeNowStatus)}
        </div>
      ) : null}
    </div>
  );
}

export type ProjectSettlementBridgeSectionProps = {
  loading: boolean;
  walletAddress: string | null;
  polygonDone: boolean;
  ethereumDone: boolean;
  bridgeAmountPolygon: string;
  bridgeTxPolygon: string;
  bridgeAmountEthereum: string;
  bridgeTxEthereum: string;
  bridgeNowBusy: Partial<Record<BridgeSourceChain, boolean>>;
  bridgeNowStatus: Partial<Record<BridgeSourceChain, string>>;
  setBridgeAmountPolygon: (value: string) => void;
  setBridgeTxPolygon: (value: string) => void;
  setBridgeAmountEthereum: (value: string) => void;
  setBridgeTxEthereum: (value: string) => void;
  recordBridge: (sourceChain: BridgeSourceChain) => Promise<void>;
  runOneClickBridge: (sourceChain: BridgeSourceChain) => Promise<void>;
};

export function ProjectSettlementBridgeSection(
  props: ProjectSettlementBridgeSectionProps
) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <BridgeCard
        title="Polygon → Avalanche"
        done={props.polygonDone}
        amount={props.bridgeAmountPolygon}
        txHash={props.bridgeTxPolygon}
        loading={props.loading}
        walletAddress={props.walletAddress}
        bridgeNowBusy={!!props.bridgeNowBusy.POLYGON}
        bridgeNowStatus={props.bridgeNowStatus.POLYGON}
        onChangeAmount={props.setBridgeAmountPolygon}
        onChangeTxHash={props.setBridgeTxPolygon}
        onRecord={() => {
          void props.recordBridge("POLYGON");
        }}
        onRunNow={() => {
          void props.runOneClickBridge("POLYGON");
        }}
      />
      <BridgeCard
        title="Ethereum → Avalanche"
        done={props.ethereumDone}
        amount={props.bridgeAmountEthereum}
        txHash={props.bridgeTxEthereum}
        loading={props.loading}
        walletAddress={props.walletAddress}
        bridgeNowBusy={!!props.bridgeNowBusy.ETHEREUM}
        bridgeNowStatus={props.bridgeNowStatus.ETHEREUM}
        onChangeAmount={props.setBridgeAmountEthereum}
        onChangeTxHash={props.setBridgeTxEthereum}
        onRecord={() => {
          void props.recordBridge("ETHEREUM");
        }}
        onRunNow={() => {
          void props.runOneClickBridge("ETHEREUM");
        }}
      />
    </div>
  );
}
