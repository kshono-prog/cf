"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Args = {
  workspaceBasePath: string;
  activeView: WorkspaceView;
};

export function useCreatorReadyWorkspaceNavigation(args: Args) {
  const workspace = useCreatorReadyWorkspace();
  const router = useRouter();
  const publicPageHref = `/${workspace.meCreatorUsername}`;
  const postingHref = `${args.workspaceBasePath}/support-page#posting-compose`;
  const isPostingOpen = workspace.openSections.sns;

  const navigateToView = React.useCallback(
    (view: WorkspaceView) => {
      router.push(`${args.workspaceBasePath}/${view}`, { scroll: true });
    },
    [args.workspaceBasePath, router]
  );

  const openPublicPage = React.useCallback(() => {
    router.push(publicPageHref, { scroll: true });
  }, [publicPageHref, router]);

  const openPostingComposer = React.useCallback(() => {
    if (!isPostingOpen) {
      workspace.onToggleSection("sns");
    }

    if (args.activeView !== "support-page") {
      router.push(postingHref, { scroll: true });
      return;
    }

    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const postingAnchor =
        document.getElementById("posting-compose") ??
        document.getElementById("sns-compose");
      postingAnchor?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [args.activeView, isPostingOpen, postingHref, router, workspace]);

  return {
    publicPageHref,
    navigateToView,
    openPublicPage,
    openPostingComposer,
  };
}
