"use client";

import React from "react";

import { AiOfficePanel } from "@/components/mypage/AiOfficePanel";
import type { AiOfficePanelUrlState } from "@/components/mypage/aiOfficePanelUrlState";

type Props = {
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
  initialUrlState?: Partial<AiOfficePanelUrlState>;
};

export function AiOfficeManagementSection(props: Props) {
  return (
    <AiOfficePanel
      walletAddress={props.walletAddress}
      projectId={props.projectId}
      isConnected={props.isConnected}
      initialUrlState={props.initialUrlState}
    />
  );
}
