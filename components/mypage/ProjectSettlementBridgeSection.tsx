"use client";

import React from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import {
  getBridgeStepStatusLabel,
  getSettlementMessage,
  getSettlementMessageState,
} from "@/lib/uxCopy";

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

function getBridgeProgressNotice(status: string): {
  tone: "success" | "error" | "info" | "attention";
  title: string;
  description?: string;
} {
  switch (status) {
    case "prepare中...":
      return {
        tone: "info",
        title: "ブリッジ実行の準備を確認しています。",
        description:
          "source chain、金額、必要な設定を順番に確認しています。",
      };
    case "approve確認中...":
      return {
        tone: "info",
        title: "approve の要否を確認しています。",
      };
    case "approve署名を待っています...":
      return {
        tone: "attention",
        title: "approve の署名を確認してください。",
        description:
          "必要な場合だけウォレット承認が表示されます。内容を確認して進めてください。",
      };
    case "bridge署名を待っています...":
      return {
        tone: "attention",
        title: "ブリッジ送信の署名を確認してください。",
        description:
          "ここから先は実際の資金移動です。送信内容を確認してから承認してください。",
      };
    case "bridge/run保存中...":
      return {
        tone: "info",
        title: "ブリッジ実行結果を保存しています。",
      };
    case "着金確認中(reverify)...":
      return {
        tone: "info",
        title: "着金確認を待っています。",
        description:
          "反映まで少し時間がかかることがあります。完了までこのままお待ちください。",
      };
    case "settlement反映中...":
      return {
        tone: "info",
        title: "精算データへ反映しています。",
      };
    case "着金未確認。時間をおいて再実行してください":
      return {
        tone: "attention",
        title: "着金確認に時間がかかっています。",
        description:
          "少し時間をおいてから再確認してください。重複実行は避けて進めます。",
      };
    case "完了":
      return {
        tone: "success",
        title: "Bridge now が完了しました。",
        description:
          "次は配分計画を保存し、送信前確認へ進みます。",
      };
    default:
      break;
  }

  if (status.includes("切り替えてください")) {
    return {
      tone: "attention",
      title: status,
      description:
        "正しい source chain に切り替えてから、もう一度実行してください。",
    };
  }

  if (status.includes("不一致")) {
    return {
      tone: "error",
      title: "ブリッジ準備情報を確認できませんでした。",
      description: status,
    };
  }

  const messageState = getSettlementMessageState(status);
  if (messageState) {
    return {
      tone:
        messageState.tone === "info" &&
        status.includes("切り替えてください")
          ? "attention"
          : messageState.tone,
      title: messageState.title,
      description: messageState.description,
    };
  }

  return {
    tone: "error",
    title: getSettlementMessage(status) ?? status,
  };
}

function BridgeCard(props: BridgeCardProps) {
  const bridgeProgressNotice = props.bridgeNowStatus
    ? getBridgeProgressNotice(props.bridgeNowStatus)
    : null;

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
      {bridgeProgressNotice ? (
        <WorkspaceStatusNotice
          tone={bridgeProgressNotice.tone}
          title={bridgeProgressNotice.title}
          description={bridgeProgressNotice.description}
        />
      ) : null}
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
          className="btn w-full disabled:opacity-40 sm:text-xs"
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
    <div className="space-y-3">
      <WorkspaceStatusNotice
        tone="attention"
        title="この手順では実際の資金移動か完了記録を扱います。"
        description="ウォレットで実行する場合は source chain 上でブリッジを送信します。手動で完了を記録するのは、すでに実行済みの内容を確認できているときだけにします。"
      />
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
    </div>
  );
}
