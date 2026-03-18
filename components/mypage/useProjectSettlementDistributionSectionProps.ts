"use client";

import { useMemo } from "react";

import type { ProjectSettlementDistributionDraftSectionProps } from "@/components/mypage/ProjectSettlementDistributionDraftSection";
import { useProjectSettlementPanel } from "@/components/mypage/useProjectSettlementPanel";

type PanelState = ReturnType<typeof useProjectSettlementPanel>;

type UseProjectSettlementDistributionSectionPropsArgs = {
  panel: PanelState;
  walletAddress: string | null;
};

export type ProjectSettlementDistributionSectionProps = {
  distributionDraft: ProjectSettlementDistributionDraftSectionProps;
};

export function useProjectSettlementDistributionSectionProps(
  args: UseProjectSettlementDistributionSectionPropsArgs
): ProjectSettlementDistributionSectionProps {
  const { panel, walletAddress } = args;

  return useMemo(
    () => ({
      distributionDraft: {
        loading: panel.loading,
        walletAddress,
        rows: panel.rows,
        aiDraftText: "",
        aiDraftMessage: null,
        canGenerateAiDraft: false,
        generateAiDraft: () => {},
        updateAiDraftText: () => {},
        applyAiDraft: () => {},
        totals: panel.totals,
        draftDirty: panel.draftDirty,
        addDraftRow: panel.addDraftRow,
        removeDraftRow: panel.removeDraftRow,
        updateDraft: panel.updateDraft,
        saveDistributions: panel.saveDistributions,
      },
    }),
    [
      panel.addDraftRow,
      panel.draftDirty,
      panel.loading,
      panel.removeDraftRow,
      panel.rows,
      panel.saveDistributions,
      panel.totals,
      panel.updateDraft,
      walletAddress,
    ]
  );
}
