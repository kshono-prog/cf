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
  { loading: () => <WorkspaceLoadingCard title="読み込んでいます" /> }
);

const CreatorReadyProjectRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyProjectRoute").then(
      (mod) => mod.CreatorReadyProjectRoute
    ),
  { loading: () => <WorkspaceLoadingCard title="プロジェクトを読み込んでいます" /> }
);

const CreatorReadyAiRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyAiRoute").then(
      (mod) => mod.CreatorReadyAiRoute
    ),
  { loading: () => <WorkspaceLoadingCard title="AIアシスタントを読み込んでいます" /> }
);

const CreatorReadyFansRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyFansRoute").then(
      (mod) => mod.CreatorReadyFansRoute
    ),
  { loading: () => <WorkspaceLoadingCard title="ファン情報を読み込んでいます" /> }
);

type Props = {
  activeView: WorkspaceView;
  workspaceBasePath: string;
  error: string | null;
  onNavigateToView: (view: WorkspaceView) => void;
};

export function CreatorReadyWorkspaceRouteContent(props: Props) {
  switch (props.activeView) {
    case "project":
      return (
        <CreatorReadyProjectRoute
          onOpenSettings={() => props.onNavigateToView("manage")}
        />
      );

    case "ai-office":
      return (
        <CreatorReadyAiRoute
          onOpenSettings={() => props.onNavigateToView("manage")}
        />
      );

    case "fans":
      return (
        <CreatorReadyFansRoute workspaceBasePath={props.workspaceBasePath} />
      );

    case "settings":
    case "manage":
      return (
        <SettingsPageClient
          workspaceBasePath={props.workspaceBasePath}
          error={props.error}
        />
      );

    // daily-work (default)
    default:
      return (
        <CreatorReadyHomeRoute
          onOpenSettings={() => props.onNavigateToView("manage")}
          workspaceBasePath={props.workspaceBasePath}
        />
      );
  }
}
