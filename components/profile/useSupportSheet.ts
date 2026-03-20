"use client";

import { useSearchParams } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";

import type { SelectedPostTipContext } from "@/components/feed/feedTypes";
import type { Currency } from "@/components/profile/profileClientHelpers";
import { parseProfileDeepLinkParams } from "@/lib/deepLink";
import type { SupportProjectView } from "@/lib/supportProfileView";

type UseSupportSheetOptions = {
  canOpenSupportSheet: boolean;
  recruitingProjectMap: Map<string, SupportProjectView>;
  viewCurrency: Currency;
  setViewCurrency: (currency: Currency) => void;
};

export type UseSupportSheetReturn = {
  supportSheetOpen: boolean;
  supportSheetLoaded: boolean;
  selectedSupportProjectId: string | null;
  selectedSupportProject: SupportProjectView | null;
  selectedPostTipContext: SelectedPostTipContext | null;
  setSelectedPostTipContext: Dispatch<SetStateAction<SelectedPostTipContext | null>>;
  openSupportSheet: () => void;
  closeSupportSheet: () => void;
  handleSelectPostTip: (post: SelectedPostTipContext) => void;
  handleOpenProjectSupport: (project: SupportProjectView) => void;
};

export function useSupportSheet({
  canOpenSupportSheet,
  recruitingProjectMap,
  viewCurrency,
  setViewCurrency,
}: UseSupportSheetOptions): UseSupportSheetReturn {
  const searchParams = useSearchParams();
  const handledSupportLinkRef = useRef<string | null>(null);

  const [selectedSupportProjectId, setSelectedSupportProjectId] =
    useState<string | null>(null);
  const [selectedPostTipContext, setSelectedPostTipContext] =
    useState<SelectedPostTipContext | null>(null);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const [supportSheetLoaded, setSupportSheetLoaded] = useState(false);

  useEffect(() => {
    const linkParams = parseProfileDeepLinkParams(
      new URLSearchParams(searchParams.toString())
    );
    const { projectId: requestedProjectId, support: supportFlag } = linkParams;
    if (!requestedProjectId) return;

    const nextProject = recruitingProjectMap.get(requestedProjectId);
    if (!nextProject) return;

    setSelectedSupportProjectId(nextProject.projectId);
    if (viewCurrency !== nextProject.currency) {
      setViewCurrency(nextProject.currency);
    }

    const supportKey = `${requestedProjectId}:${supportFlag ?? ""}`;
    if (supportFlag === "1" && handledSupportLinkRef.current !== supportKey) {
      handledSupportLinkRef.current = supportKey;
      setSupportSheetLoaded(true);
      setSupportSheetOpen(true);
    }
  }, [recruitingProjectMap, searchParams, viewCurrency, setViewCurrency]);

  const selectedSupportProject = useMemo(
    () =>
      selectedSupportProjectId
        ? recruitingProjectMap.get(selectedSupportProjectId) ?? null
        : null,
    [recruitingProjectMap, selectedSupportProjectId]
  );

  function openSupportSheet() {
    if (!canOpenSupportSheet) return;
    setSupportSheetLoaded(true);
    setSupportSheetOpen(true);
  }

  function closeSupportSheet() {
    setSupportSheetOpen(false);
    setSelectedPostTipContext(null);
  }

  function handleSelectPostTip(post: SelectedPostTipContext) {
    if (!canOpenSupportSheet) return;
    setSelectedPostTipContext(post);
    if (post.projectId) {
      const linkedProject = recruitingProjectMap.get(post.projectId);
      if (linkedProject) {
        setSelectedSupportProjectId(linkedProject.projectId);
        if (viewCurrency !== linkedProject.currency) {
          setViewCurrency(linkedProject.currency);
        }
      }
    } else if (post.preferredCurrency) {
      setViewCurrency(post.preferredCurrency);
    }
    setSupportSheetLoaded(true);
    setSupportSheetOpen(true);
  }

  function handleOpenProjectSupport(project: SupportProjectView) {
    setSelectedPostTipContext(null);
    setSelectedSupportProjectId(project.projectId);
    if (viewCurrency !== project.currency) {
      setViewCurrency(project.currency);
    }
    setSupportSheetLoaded(true);
    setSupportSheetOpen(true);
  }

  return {
    supportSheetOpen,
    supportSheetLoaded,
    selectedSupportProjectId,
    selectedSupportProject,
    selectedPostTipContext,
    setSelectedPostTipContext,
    openSupportSheet,
    closeSupportSheet,
    handleSelectPostTip,
    handleOpenProjectSupport,
  };
}
