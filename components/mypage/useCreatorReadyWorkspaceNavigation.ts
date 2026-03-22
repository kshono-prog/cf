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
  const postingHref = `${args.workspaceBasePath}/settings#posting-compose`;
  const isPostingOpen = workspace.openSections.posting;

  const navigateToView = React.useCallback(
    (view: WorkspaceView) => {
      router.push(`${args.workspaceBasePath}/${view}`, { scroll: true });
    },
    [args.workspaceBasePath, router]
  );

  const openPublicPageInNewTab = React.useCallback(() => {
    window.open(publicPageHref, "_blank", "noopener,noreferrer");
  }, [publicPageHref]);

  const openPostingComposer = React.useCallback(() => {
    if (!isPostingOpen) {
      workspace.onToggleSection("posting");
    }

    if (args.activeView !== "settings") {
      router.push(postingHref, { scroll: true });
      return;
    }

    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document.getElementById("posting-compose")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [args.activeView, isPostingOpen, postingHref, router, workspace]);

  return {
    publicPageHref,
    navigateToView,
    openPublicPageInNewTab,
    openPostingComposer,
  };
}
