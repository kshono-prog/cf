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
    <div className="space-y-3 rounded-lg border p-3">
      <div className="text-sm font-medium">{props.title}</div>
      <a
        href="https://portalbridge.com/"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 underline"
      >
        推奨ブリッジを開く（Wormhole）
      </a>
      <div className="text-[11px] text-gray-600 sm:text-xs">
        状態: {getBridgeStepStatusLabel(props.done ? "COMPLETED" : "PENDING")}
      </div>
      <input
        className="w-full rounded border px-3 py-2 text-sm sm:px-2 sm:py-1.5 sm:text-xs"
        placeholder="ブリッジ済み金額（最小単位）"
        value={props.amount}
        onChange={(e) => props.onChangeAmount(e.target.value)}
        inputMode="numeric"
      />
      <input
        className="w-full rounded border px-3 py-2 text-sm font-mono sm:px-2 sm:py-1.5 sm:text-xs"
        placeholder="トランザクションハッシュ（任意）"
        value={props.txHash}
        onChange={(e) => props.onChangeTxHash(e.target.value)}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40 sm:py-1.5 sm:text-xs"
          onClick={props.onRecord}
          disabled={props.loading || !props.walletAddress}
        >
          完了を記録
        </button>
        <button
          type="button"
          className="w-full rounded border px-3 py-2 text-sm disabled:opacity-40 sm:py-1.5 sm:text-xs"
          onClick={props.onRunNow}
          disabled={
            props.loading || !props.walletAddress || props.bridgeNowBusy
          }
        >
          {props.bridgeNowBusy ? "ウォレットで実行中..." : "ウォレットで実行する"}
        </button>
      </div>
      {props.bridgeNowStatus ? (
        <div className="break-all text-[11px] leading-5 text-gray-600">
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
