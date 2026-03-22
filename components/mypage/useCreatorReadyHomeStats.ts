"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";

import { fetchPostingAnalyticsSummary } from "@/lib/mypage/postingApi";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";

export type HomeStats = {
  loadingPosting: boolean;
  postCount: number | null;
  publishedCount: number | null;
  jpycTotal: string | null;
  usdcTotal: string | null;
  avgProgressPct: number;
};

export function useCreatorReadyHomeStats({
  address,
  projectDashboardsByCurrency,
}: {
  address: Address | undefined;
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
}): HomeStats {
  const [postCount, setPostCount] = useState<number | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [loadingPosting, setLoadingPosting] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoadingPosting(true);
    fetchPostingAnalyticsSummary({ address })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setPostCount(res.summary.postCount);
          setPublishedCount(res.summary.publishedCount);
        }
      })
      .catch(() => {
        // サマリー取得失敗は非致命的 — 表示をスキップ
      })
      .finally(() => {
        if (!cancelled) setLoadingPosting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const jpycDashboard = projectDashboardsByCurrency.JPYC;
  const usdcDashboard = projectDashboardsByCurrency.USDC;

  const jpycTotal = hasProjectSummary(jpycDashboard)
    ? (jpycDashboard.summary.progress?.totals?.JPYC ?? null)
    : null;

  const usdcTotal = hasProjectSummary(usdcDashboard)
    ? (usdcDashboard.summary.progress?.totals?.USDC ?? null)
    : null;

  const progressPcts = (
    [
      hasProjectSummary(jpycDashboard)
        ? (jpycDashboard.summary.progress?.progressPct ?? null)
        : null,
      hasProjectSummary(usdcDashboard)
        ? (usdcDashboard.summary.progress?.progressPct ?? null)
        : null,
    ] as (number | null)[]
  ).filter((v): v is number => v !== null);

  const avgProgressPct =
    progressPcts.length > 0
      ? Math.floor(progressPcts.reduce((s, v) => s + v, 0) / progressPcts.length)
      : 0;

  return {
    loadingPosting,
    postCount,
    publishedCount,
    jpycTotal,
    usdcTotal,
    avgProgressPct,
  };
}
