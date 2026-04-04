"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadySupporterOverview } from "@/components/mypage/useCreatorReadySupporterOverview";
import { useCreatorReadySupporterCrm } from "@/components/mypage/useCreatorReadySupporterCrm";
import { useCreatorReadyFanEngagement } from "@/components/mypage/useCreatorReadyFanEngagement";
import { useCreatorReadyGrowthReflection } from "@/components/mypage/useCreatorReadyGrowthReflection";
import { CreatorReadySupporterOverviewSection } from "@/components/mypage/CreatorReadySupporterOverviewSection";
import { CreatorReadySupporterCrmSection } from "@/components/mypage/CreatorReadySupporterCrmSection";
import { FanEngagementTimelineCard } from "@/components/mypage/FanEngagementTimelineCard";
import { FanEngagementHeatmapCard } from "@/components/mypage/FanEngagementHeatmapCard";
import { FanThankActionCard } from "@/components/mypage/FanThankActionCard";
import { CreatorReadyGrowthReflectionSection } from "@/components/mypage/CreatorReadyGrowthReflectionSection";

type Props = {
  workspaceBasePath: string;
};

export function CreatorReadyFansRoute({ workspaceBasePath }: Props) {
  const workspace = useCreatorReadyWorkspace();
  const isActive = workspace.isConnected && !workspace.isManualCheck;

  const supporterOverview = useCreatorReadySupporterOverview({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const supporterCrm = useCreatorReadySupporterCrm({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const fanEngagement = useCreatorReadyFanEngagement({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const growthReflection = useCreatorReadyGrowthReflection({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const aiOfficeCreateFanRelationHref = "#ai-office";

  return (
    <div className="space-y-4">
      {/* ── サポーター概要 ── */}
      <CreatorReadySupporterOverviewSection
        loading={supporterOverview.loading}
        error={supporterOverview.error}
        data={supporterOverview.data}
        aiOfficeCreateFanRelationHref={aiOfficeCreateFanRelationHref}
      />

      {/* ── エンゲージメント ── */}
      <FanEngagementHeatmapCard
        heatmap={fanEngagement.data?.heatmap ?? null}
        peakWeekday={fanEngagement.data?.peakWeekday ?? null}
        error={fanEngagement.error}
      />
      <FanEngagementTimelineCard
        loading={fanEngagement.loading}
        error={fanEngagement.error}
        data={fanEngagement.data}
      />

      {/* ── お礼アクション ── */}
      <FanThankActionCard
        thankNeededCount={fanEngagement.data?.thankNeededCount ?? 0}
        projectId={workspace.localProjectId}
        workspaceBasePath={workspaceBasePath}
      />

      {/* ── サポーターCRM ── */}
      <CreatorReadySupporterCrmSection
        data={supporterCrm.data}
        error={supporterCrm.error}
      />

      {/* ── 振り返り ── */}
      <CreatorReadyGrowthReflectionSection
        loading={growthReflection.loading}
        error={growthReflection.error}
        data={growthReflection.data}
      />
    </div>
  );
}
