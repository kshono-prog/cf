"use client";

import React from "react";

import { ProjectSettlementBridgeSection } from "@/components/mypage/ProjectSettlementBridgeSection";
import { ProjectSettlementCctpSection } from "@/components/mypage/ProjectSettlementCctpSection";
import { ProjectSettlementDistributionDraftSection } from "@/components/mypage/ProjectSettlementDistributionDraftSection";
import { ProjectSettlementDistributionExecutionSection } from "@/components/mypage/ProjectSettlementDistributionExecutionSection";
import { ProjectSettlementExecutionLogsSection } from "@/components/mypage/ProjectSettlementExecutionLogsSection";
import { ProjectSettlementManualResultSection } from "@/components/mypage/ProjectSettlementManualResultSection";
import { useProjectSettlementBridgeSectionProps } from "@/components/mypage/useProjectSettlementBridgeSectionProps";
import { useProjectSettlementDistributionSectionProps } from "@/components/mypage/useProjectSettlementDistributionSectionProps";
import { useProjectSettlementExecutionSectionProps } from "@/components/mypage/useProjectSettlementExecutionSectionProps";
import { useProjectSettlementPanel } from "@/components/mypage/useProjectSettlementPanel";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

function statusBadgeClass(
  status: ProjectSettlementData["settlement"]["status"] | "NOT_READY"
): string {
  if (status === "READY_FOR_DISTRIBUTION") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "DISTRIBUTED") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (status === "BRIDGING") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

type Props = {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency?: CurrencyCode;
  initialData?: ProjectSettlementData | null;
};

export function ProjectSettlementPanel(props: Props) {
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency = "JPYC",
    initialData = null,
  } = props;

  const panel = useProjectSettlementPanel({
    projectId,
    walletAddress,
    isConnected,
    projectCurrency,
    initialData,
  });
  const bridgeSectionProps = useProjectSettlementBridgeSectionProps({
    panel,
    walletAddress,
  });
  const distributionSectionProps = useProjectSettlementDistributionSectionProps({
    panel,
    walletAddress,
  });
  const executionSectionProps = useProjectSettlementExecutionSectionProps({
    panel,
    walletAddress,
    isConnected,
    projectCurrency,
  });

  if (!panel.canUse) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        Projectを作成すると、Bridge/Distribution設定が表示されます。
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <div className="font-semibold">
            Settlement (Bridge → Distribution) [{projectCurrency}]
          </div>
          <div className="text-xs text-gray-500 mt-1">
            本UIは資金を保管しません。送金・ブリッジは必ずユーザー自身のウォレットで実行されます。
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs border px-2 py-1 rounded ${statusBadgeClass(
              panel.settlement?.status ?? "NOT_READY"
            )}`}
          >
            {panel.settlement?.status ?? "NOT_READY"}
          </span>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => void panel.recompute()}
            disabled={panel.loading}
          >
            Recompute
          </button>
        </div>
      </div>

      {panel.walletNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2">
          {panel.walletNotice}
        </div>
      ) : null}

      {panel.message ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 px-3 py-2">
          {panel.message}
        </div>
      ) : null}

      <ProjectSettlementBridgeSection {...bridgeSectionProps} />

      <ProjectSettlementDistributionDraftSection
        {...distributionSectionProps.distributionDraft}
      />

      <ProjectSettlementDistributionExecutionSection
        {...executionSectionProps.distributionExecution}
      />

      <ProjectSettlementExecutionLogsSection
        {...executionSectionProps.executionLogs}
      />

      {executionSectionProps.cctp ? (
        <ProjectSettlementCctpSection {...executionSectionProps.cctp} />
      ) : null}

      <ProjectSettlementManualResultSection
        {...executionSectionProps.manualResult}
      />
    </div>
  );
}
