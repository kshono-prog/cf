"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";

import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";
import type {
  OpenSections,
  SectionKey,
} from "@/components/mypage/MyPageAccordion";
import type {
  CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import { CreatorReadyWorkspaceProvider } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { CreatorReadyAdvancedRoute } from "@/components/mypage/CreatorReadyAdvancedRoute";
import { CreatorReadyHomeRoute } from "@/components/mypage/CreatorReadyHomeRoute";
import { CreatorReadyPublicRoute } from "@/components/mypage/CreatorReadyPublicRoute";
import { CreatorReadySupportersRoute } from "@/components/mypage/CreatorReadySupportersRoute";
import { CreatorReadySupportPageRoute } from "@/components/mypage/CreatorReadySupportPageRoute";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { CREATOR_READY_WORKSPACE_VIEWS } from "@/components/mypage/creatorReadyWorkspaceConfig";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  initialWorkspaceView: WorkspaceView;
  workspaceBasePath: string;
  meCreatorUsername: string;
  eventBaseUrl: string;
  themeColor: string;
  error: string | null;
  localProjectId: string | null;
  address: Address | undefined;
  isConnected: boolean;
  editingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  displayName: string;
  profile: string;
  avatarUrl: string;
  themeColorValue: string;
  creatorType: CreatorProfile["creatorType"];
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setCreatorType: React.Dispatch<
    React.SetStateAction<CreatorProfile["creatorType"]>
  >;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
  openSections: OpenSections;
  onToggleSection: (key: SectionKey) => void;
};

export function CreatorReadyAccountView(props: Props) {
  const router = useRouter();
  const promoHeaderColor = props.themeColor || "#005bbb";
  const activeView = props.initialWorkspaceView;
  const composeHref = `${props.workspaceBasePath}/support-page#sns-compose`;
  const isSnsOpen = props.openSections.sns;
  const toggleSection = props.onToggleSection;

  const navigateToView = React.useCallback(
    (view: WorkspaceView) => {
      router.push(`${props.workspaceBasePath}/${view}`, { scroll: true });
    },
    [props.workspaceBasePath, router]
  );
  const handleOpenComposer = React.useCallback(() => {
    if (!isSnsOpen) {
      toggleSection("sns");
    }

    if (activeView !== "support-page") {
      router.push(composeHref, { scroll: true });
      return;
    }

    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document.getElementById("sns-compose")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [
    activeView,
    composeHref,
    isSnsOpen,
    router,
    toggleSection,
  ]);
  const workspaceState = React.useMemo(
    () => ({
      meCreatorUsername: props.meCreatorUsername,
      eventBaseUrl: props.eventBaseUrl,
      localProjectId: props.localProjectId,
      address: props.address,
      isConnected: props.isConnected,
      editingProfile: props.editingProfile,
      onStartEditProfile: props.onStartEditProfile,
      onCancelEditProfile: props.onCancelEditProfile,
      displayName: props.displayName,
      profile: props.profile,
      avatarUrl: props.avatarUrl,
      themeColorValue: props.themeColorValue,
      creatorType: props.creatorType,
      socials: props.socials,
      youtubeVideos: props.youtubeVideos,
      avatarFile: props.avatarFile,
      avatarPreview: props.avatarPreview,
      setDisplayName: props.setDisplayName,
      setProfile: props.setProfile,
      setThemeColor: props.setThemeColor,
      setCreatorType: props.setCreatorType,
      setSocials: props.setSocials,
      setYoutubeVideos: props.setYoutubeVideos,
      setAvatarFile: props.setAvatarFile,
      setAvatarPreview: props.setAvatarPreview,
      saving: props.saving,
      onSubmitProfile: props.onSubmitProfile,
      projectIdsByCurrency: props.projectIdsByCurrency,
      onActiveProjectIdChange: props.onActiveProjectIdChange,
      openSections: props.openSections,
      onToggleSection: props.onToggleSection,
    }),
    [
      props.address,
      props.avatarFile,
      props.avatarPreview,
      props.avatarUrl,
      props.creatorType,
      props.displayName,
      props.editingProfile,
      props.eventBaseUrl,
      props.isConnected,
      props.localProjectId,
      props.meCreatorUsername,
      props.onActiveProjectIdChange,
      props.onCancelEditProfile,
      props.onStartEditProfile,
      props.onSubmitProfile,
      props.onToggleSection,
      props.openSections,
      props.profile,
      props.projectIdsByCurrency,
      props.saving,
      props.setAvatarFile,
      props.setAvatarPreview,
      props.setDisplayName,
      props.setProfile,
      props.setCreatorType,
      props.setSocials,
      props.setThemeColor,
      props.setYoutubeVideos,
      props.socials,
      props.themeColorValue,
      props.youtubeVideos,
    ]
  );

  const activeWorkspace = CREATOR_READY_WORKSPACE_VIEWS.find(
    (view) => view.id === activeView
  );

  return (
    <MyPageShell headerColor={promoHeaderColor}>
      <CreatorReadyWorkspaceProvider value={workspaceState}>
        <div className="container-narrow space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-lg font-semibold">
                {activeWorkspace?.label ?? "やること一覧"}
              </h1>
              <button
                type="button"
                className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={handleOpenComposer}
              >
                投稿する
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              {CREATOR_READY_WORKSPACE_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    activeView === view.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-gray-200 bg-white text-gray-900"
                  }`}
                  onClick={() => navigateToView(view.id)}
                >
                  <div className="text-sm font-semibold">{view.label}</div>
                  <div
                    className={`mt-1 text-xs ${
                      activeView === view.id ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {view.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {props.error && (
            <WorkspaceStatusNotice tone="error" title={props.error} />
          )}

          {activeView === "home" ? (
            <CreatorReadyHomeRoute
              onOpenSupportPage={() => navigateToView("support-page")}
              onOpenSupporterResponse={() => navigateToView("supporters")}
              onOpenPublicPage={() => navigateToView("public")}
              onOpenAdvancedSettings={() => navigateToView("advanced")}
            />
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm text-gray-700">
                  {`${props.workspaceBasePath}/${activeView}`} でこの面を直接開けます。
                </div>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
                  onClick={() => navigateToView("home")}
                >
                  やること一覧へ戻る
                </button>
              </div>
              {activeView === "support-page" ? (
                <CreatorReadySupportPageRoute />
              ) : activeView === "supporters" ? (
                <CreatorReadySupportersRoute />
              ) : activeView === "public" ? (
                <CreatorReadyPublicRoute />
              ) : activeView === "advanced" ? (
                <CreatorReadyAdvancedRoute />
              ) : null}
            </>
          )}
        </div>
      </CreatorReadyWorkspaceProvider>
    </MyPageShell>
  );
}
