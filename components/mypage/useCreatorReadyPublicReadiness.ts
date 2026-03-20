"use client";

import React from "react";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { buildPublicReadiness } from "@/lib/mypage/publicReadiness";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";

export function useCreatorReadyPublicReadiness(
  projectDashboardsByCurrency: ProjectDashboardsByCurrency
) {
  const workspace = useCreatorReadyWorkspace();

  return React.useMemo(
    () =>
      buildPublicReadiness({
        displayName: workspace.displayName,
        profile: workspace.profile,
        avatarUrl: workspace.avatarUrl,
        creatorType: workspace.creatorType,
        projectDashboardsByCurrency,
      }),
    [
      projectDashboardsByCurrency,
      workspace.avatarUrl,
      workspace.creatorType,
      workspace.displayName,
      workspace.profile,
    ]
  );
}
