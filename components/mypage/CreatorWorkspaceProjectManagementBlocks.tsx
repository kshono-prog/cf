"use client";

import { CurrencyProjectManagementBlock } from "@/components/mypage/CurrencyProjectManagementBlock";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

export function CreatorWorkspaceProjectManagementBlocks(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="space-y-4">
      {(["JPYC", "USDC"] as const).map((currency) => (
        <CurrencyProjectManagementBlock
          key={currency}
          currency={currency}
          ownerAddress={workspace.address?.toLowerCase() ?? ""}
          activeProjectId={workspace.projectIdsByCurrency[currency]}
          initialDashboard={props.projectDashboardsByCurrency[currency]}
          walletAddress={workspace.address ?? null}
          isConnected={workspace.isConnected}
          onActiveProjectIdChange={workspace.onActiveProjectIdChange}
        />
      ))}
    </div>
  );
}
