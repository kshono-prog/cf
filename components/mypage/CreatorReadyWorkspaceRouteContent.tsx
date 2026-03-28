"use client";

import dynamic from "next/dynamic";

import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";
import { SettingsPageClient } from "@/components/mypage/SettingsPageClient";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

const CreatorReadyHomeRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyHomeRoute").then(
      (mod) => mod.CreatorReadyHomeRoute
    ),
  {
    loading: () => <WorkspaceLoadingCard title="読み込んでいます" />,
  }
);

type Props = {
  activeView: WorkspaceView;
  workspaceBasePath: string;
  error: string | null;
  onNavigateToView: (view: WorkspaceView) => void;
};

export function CreatorReadyWorkspaceRouteContent(props: Props) {
  if (props.activeView === "settings") {
    return (
      <SettingsPageClient
        workspaceBasePath={props.workspaceBasePath}
        error={props.error}
      />
    );
  }

  // daily-work (default)
  return (
    <CreatorReadyHomeRoute
      onOpenSettings={() => props.onNavigateToView("settings")}
      workspaceBasePath={props.workspaceBasePath}
    />
  );
}
