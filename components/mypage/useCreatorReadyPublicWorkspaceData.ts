"use client";

import React from "react";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyPublicReadiness } from "@/components/mypage/useCreatorReadyPublicReadiness";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import type { ProjectIdsByCurrency } from "@/lib/mypage/accountPageTypes";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";
import type { PostingProjectOption } from "@/lib/mypage/postingApi";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

function buildPostingProjectOptions(args: {
  projectIdsByCurrency: ProjectIdsByCurrency;
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
}): PostingProjectOption[] {
  const options: PostingProjectOption[] = [];
  const seenProjectIds = new Set<string>();

  for (const currency of ["JPYC", "USDC"] as const) {
    const dashboard = args.projectDashboardsByCurrency[currency];
    const summaryProject = dashboard?.summary?.project ?? null;
    const projectId = summaryProject?.id ?? args.projectIdsByCurrency[currency];

    if (!projectId || seenProjectIds.has(projectId)) continue;
    seenProjectIds.add(projectId);

    options.push({
      id: projectId,
      currency,
      title: summaryProject?.title ?? `${currency} プロジェクト`,
      status: summaryProject?.status ?? "ACTIVE",
      label: `${currency} / ${summaryProject?.title ?? `${currency} プロジェクト`}`,
    });
  }

  return options;
}

export function useCreatorReadyPublicWorkspaceData(view: WorkspaceView) {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards(view);
  const publicReadiness = useCreatorReadyPublicReadiness(
    projectDashboardsByCurrency
  );

  const postingProjectOptions = React.useMemo(
    () =>
      buildPostingProjectOptions({
        projectIdsByCurrency: workspace.projectIdsByCurrency,
        projectDashboardsByCurrency,
      }),
    [projectDashboardsByCurrency, workspace.projectIdsByCurrency]
  );

  return {
    dashboardError,
    projectDashboardsByCurrency,
    publicReadiness,
    postingProjectOptions,
  };
}
