"use client";

import React from "react";
import {
  useQuery,
  type QueryKey,
} from "@tanstack/react-query";
import type { Address } from "viem";

import { fetchMyPageDashboard } from "@/lib/mypage/api";
import type {
  MyPageDashboardData,
  ProjectDashboardsByCurrency,
} from "@/lib/mypage/dashboardTypes";
import {
  projectMyPageDashboardDataForView,
} from "@/lib/mypage/dashboardTypes";
import type { ProjectIdsByCurrency } from "@/lib/mypage/accountPageTypes";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

const EMPTY_PROJECT_DASHBOARDS: ProjectDashboardsByCurrency = {
  JPYC: null,
  USDC: null,
};

function buildDashboardQueryKey(args: {
  address: Address;
  projectIdsByCurrency: ProjectIdsByCurrency;
}): QueryKey {
  return [
    "mypage-dashboard",
    args.address.toLowerCase(),
    args.projectIdsByCurrency.JPYC ?? "none",
    args.projectIdsByCurrency.USDC ?? "none",
  ];
}

export function useCreatorReadyProjectDashboards(args: {
  view: WorkspaceView;
  address: Address | undefined;
  isConnected: boolean;
  projectIdsByCurrency: ProjectIdsByCurrency;
}) {
  const { view, address, isConnected, projectIdsByCurrency } = args;
  const queryKey = React.useMemo(
    () =>
      address
        ? buildDashboardQueryKey({
            address,
            projectIdsByCurrency,
          })
        : null,
    [address, projectIdsByCurrency]
  );

  const query = useQuery<MyPageDashboardData, Error>({
    queryKey: queryKey ?? ["mypage-dashboard", "disabled", view],
    enabled: Boolean(isConnected && address),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!address) {
        throw new Error("運営データの取得に失敗しました。");
      }

      const result = await fetchMyPageDashboard({
        apiBase: "",
        address,
        view: "daily-work",
      });

      if (!result.ok) {
        throw new Error(
          "運営データの取得に失敗しました。時間をおいて再度お試しください。"
        );
      }

      return result.data;
    },
  });

  const refreshProjectDashboards = React.useCallback(async () => {
    await query.refetch();
  }, [query]);

  const projectedData = React.useMemo(
    () =>
      query.data ? projectMyPageDashboardDataForView(query.data, view) : null,
    [query.data, view]
  );
  const projectDashboardsByCurrency =
    projectedData?.projectsByCurrency ?? EMPTY_PROJECT_DASHBOARDS;
  const dashboardError = query.error?.message ?? null;

  return {
    dashboardError,
    projectDashboardsByCurrency,
    refreshProjectDashboards,
  };
}
