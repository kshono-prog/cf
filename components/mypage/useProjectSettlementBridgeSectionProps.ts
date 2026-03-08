"use client";

import { useMemo } from "react";

import type { ProjectSettlementBridgeSectionProps } from "@/components/mypage/ProjectSettlementBridgeSection";
import { useProjectSettlementPanel } from "@/components/mypage/useProjectSettlementPanel";

type PanelState = ReturnType<typeof useProjectSettlementPanel>;

type UseProjectSettlementBridgeSectionPropsArgs = {
  panel: PanelState;
  walletAddress: string | null;
};

export function useProjectSettlementBridgeSectionProps(
  args: UseProjectSettlementBridgeSectionPropsArgs
): ProjectSettlementBridgeSectionProps {
  const { panel, walletAddress } = args;

  return useMemo(
    () => ({
      loading: panel.loading,
      walletAddress,
      polygonDone: panel.polygonDone,
      ethereumDone: panel.ethereumDone,
      bridgeAmountPolygon: panel.bridgeAmountPolygon,
      bridgeTxPolygon: panel.bridgeTxPolygon,
      bridgeAmountEthereum: panel.bridgeAmountEthereum,
      bridgeTxEthereum: panel.bridgeTxEthereum,
      bridgeNowBusy: panel.bridgeNowBusy,
      bridgeNowStatus: panel.bridgeNowStatus,
      setBridgeAmountPolygon: panel.setBridgeAmountPolygon,
      setBridgeTxPolygon: panel.setBridgeTxPolygon,
      setBridgeAmountEthereum: panel.setBridgeAmountEthereum,
      setBridgeTxEthereum: panel.setBridgeTxEthereum,
      recordBridge: panel.recordBridge,
      runOneClickBridge: panel.runOneClickBridge,
    }),
    [
      panel.bridgeAmountEthereum,
      panel.bridgeAmountPolygon,
      panel.bridgeNowBusy,
      panel.bridgeNowStatus,
      panel.bridgeTxEthereum,
      panel.bridgeTxPolygon,
      panel.ethereumDone,
      panel.loading,
      panel.polygonDone,
      panel.recordBridge,
      panel.runOneClickBridge,
      panel.setBridgeAmountEthereum,
      panel.setBridgeAmountPolygon,
      panel.setBridgeTxEthereum,
      panel.setBridgeTxPolygon,
      walletAddress,
    ]
  );
}
