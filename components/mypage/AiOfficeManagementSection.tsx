"use client";

import React from "react";

import { AiOfficePanel } from "@/components/mypage/AiOfficePanel";

type Props = {
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
};

export function AiOfficeManagementSection(props: Props) {
  return (
    <AiOfficePanel
      walletAddress={props.walletAddress}
      projectId={props.projectId}
      isConnected={props.isConnected}
    />
  );
}
