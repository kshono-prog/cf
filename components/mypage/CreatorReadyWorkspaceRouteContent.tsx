"use client";

import dynamic from "next/dynamic";

import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

const CreatorReadyHomeRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyHomeRoute").then(
      (mod) => mod.CreatorReadyHomeRoute
    ),
  {
    loading: () => <WorkspaceLoadingCard title="ホームを読み込んでいます" />,
  }
);

const CreatorReadySupportPageRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadySupportPageRoute").then(
      (mod) => mod.CreatorReadySupportPageRoute
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="公開ページ・プロフィール設定を読み込んでいます" />
    ),
  }
);

const CreatorReadySupportersRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadySupportersRoute").then(
      (mod) => mod.CreatorReadySupportersRoute
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="AIの提案と確認を読み込んでいます" />
    ),
  }
);

const CreatorReadyPublicRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyPublicRoute").then(
      (mod) => mod.CreatorReadyPublicRoute
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="公開ページを読み込んでいます" />
    ),
  }
);

const CreatorReadyAdvancedRoute = dynamic(
  () =>
    import("@/components/mypage/CreatorReadyAdvancedRoute").then(
      (mod) => mod.CreatorReadyAdvancedRoute
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="精算・詳細設定を読み込んでいます" />
    ),
  }
);

type Props = {
  activeView: WorkspaceView;
  workspaceBasePath: string;
  onNavigateToView: (view: WorkspaceView) => void;
};

export function CreatorReadyWorkspaceRouteContent(props: Props) {
  if (props.activeView === "home") {
    return (
      <CreatorReadyHomeRoute
        onOpenSupportPage={() => props.onNavigateToView("support-page")}
        onOpenSupporterResponse={() => props.onNavigateToView("supporters")}
        onOpenPublicPage={() => props.onNavigateToView("public")}
        onOpenAdvancedSettings={() => props.onNavigateToView("advanced")}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-sm text-gray-500">
          直接 URL でアクセスできます：
          {`${props.workspaceBasePath}/${props.activeView}`}
        </div>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
          onClick={() => props.onNavigateToView("home")}
        >
          ホームに戻る
        </button>
      </div>
      {props.activeView === "support-page" ? (
        <CreatorReadySupportPageRoute />
      ) : props.activeView === "supporters" ? (
        <CreatorReadySupportersRoute />
      ) : props.activeView === "public" ? (
        <CreatorReadyPublicRoute />
      ) : props.activeView === "advanced" ? (
        <CreatorReadyAdvancedRoute />
      ) : null}
    </>
  );
}
