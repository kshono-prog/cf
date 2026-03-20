"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { WalletOverviewCard } from "@/components/mypage/WalletOverviewCard";

export function CreatorSettingsWalletSection() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div id="wallet-section">
      <WalletOverviewCard
        address={workspace.address}
        isConnected={workspace.isConnected}
      />
    </div>
  );
}
