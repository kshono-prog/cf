"use client";

import React from "react";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import {
  buildCreatorReadyBetaActions,
  buildCreatorReadyQuickActions,
  hasCreatorReadySettlementAttention,
  parseCreatorReadyWaitingTasks,
  type HomeTaskPreview,
} from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { useCreatorReadyPublicReadiness } from "@/components/mypage/useCreatorReadyPublicReadiness";
import {
  hasProjectSummary,
  type ProjectDashboardsByCurrency,
} from "@/lib/mypage/dashboardTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type Args = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
  onOpenAdvancedSettings: () => void;
};

export function useCreatorReadyWorkspaceOverviewData(args: Args) {
  const workspace = useCreatorReadyWorkspace();
  const [loadingAiSummary, setLoadingAiSummary] = React.useState(false);
  const [aiSummaryError, setAiSummaryError] = React.useState<string | null>(null);
  const [waitingTasks, setWaitingTasks] = React.useState<HomeTaskPreview[]>([]);

  const activeDashboards = React.useMemo(
    () =>
      (["JPYC", "USDC"] as const)
        .map((currency) => args.projectDashboardsByCurrency[currency])
        .filter(hasProjectSummary),
    [args.projectDashboardsByCurrency]
  );
  const publicReadiness = useCreatorReadyPublicReadiness(
    args.projectDashboardsByCurrency
  );
  const waitingApprovalCount = waitingTasks.length;
  const settlementAttentionNeeded = React.useMemo(
    () => hasCreatorReadySettlementAttention(activeDashboards),
    [activeDashboards]
  );
  const quickActions = React.useMemo(
    () =>
      buildCreatorReadyQuickActions({
        activeDashboards,
        waitingApprovalCount,
        onOpenSupportPage: args.onOpenSupportPage,
        onOpenSupporterResponse: args.onOpenSupporterResponse,
        onOpenPublicPage: args.onOpenPublicPage,
      }),
    [
      activeDashboards,
      args.onOpenPublicPage,
      args.onOpenSupportPage,
      args.onOpenSupporterResponse,
      waitingApprovalCount,
    ]
  );
  const betaActions = React.useMemo(
    () =>
      buildCreatorReadyBetaActions({
        onOpenSupporterResponse: args.onOpenSupporterResponse,
        onOpenAdvancedSettings: args.onOpenAdvancedSettings,
      }),
    [args.onOpenAdvancedSettings, args.onOpenSupporterResponse]
  );

  React.useEffect(() => {
    if (!workspace.isConnected || !workspace.address) {
      setWaitingTasks([]);
      setAiSummaryError(null);
      return;
    }

    const walletAddress = workspace.address;
    let cancelled = false;

    async function loadAiSummary(): Promise<void> {
      setLoadingAiSummary(true);
      setAiSummaryError(null);

      try {
        const response = await ownerAuthFetch({
          address: walletAddress,
          url: `/api/ai-office/dashboard?address=${encodeURIComponent(
            walletAddress
          )}${
            workspace.localProjectId
              ? `&projectId=${encodeURIComponent(workspace.localProjectId)}`
              : ""
          }&taskLimit=20`,
          init: { cache: "no-store" },
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          if (!cancelled) {
            setAiSummaryError("AIの提案状況を取得できませんでした。");
            setWaitingTasks([]);
          }
          return;
        }

        if (!cancelled) {
          setWaitingTasks(parseCreatorReadyWaitingTasks(json));
        }
      } catch {
        if (!cancelled) {
          setAiSummaryError("AIの提案状況を取得できませんでした。");
          setWaitingTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAiSummary(false);
        }
      }
    }

    void loadAiSummary();

    return () => {
      cancelled = true;
    };
  }, [workspace.address, workspace.isConnected, workspace.localProjectId]);

  return {
    loadingAiSummary,
    aiSummaryError,
    waitingTasks,
    waitingApprovalCount,
    publicReadiness,
    settlementAttentionNeeded,
    quickActions,
    betaActions,
  };
}
