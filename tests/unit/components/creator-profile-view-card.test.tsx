import React, { type Dispatch, type SetStateAction } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreatorProfileViewCard } from "@/components/mypage/CreatorProfileViewCard";
import {
  CreatorReadyWorkspaceProvider,
  type CreatorReadyWorkspaceState,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { DEFAULT_PUBLIC_PAGE_CONFIG } from "@/lib/publicPageConfig";

function noopDispatch<T>(): Dispatch<SetStateAction<T>> {
  return () => undefined;
}

function buildWorkspaceState(
  overrides: Partial<CreatorReadyWorkspaceState> = {}
): CreatorReadyWorkspaceState {
  return {
    meCreatorUsername: "e2e-creator",
    qrcodeUrl: null,
    eventBaseUrl: "https://example.com",
    localProjectId: "project-1",
    address: undefined,
    isConnected: true,
    isManualCheck: false,
    editingProfile: false,
    onStartEditProfile: () => undefined,
    onCancelEditProfile: () => undefined,
    displayName: "Test Creator",
    profile: "Profile text",
    avatarUrl: "",
    externalUrl: "https://example.com",
    themeColorValue: "#005bbb",
    creatorType: "MUSICIAN",
    ecosystemRole: "CREATOR",
    publicPage: DEFAULT_PUBLIC_PAGE_CONFIG,
    socials: {
      website: "https://example.com",
      twitter: "https://x.com/testcreator",
      youtube: "https://youtube.com/@testcreator",
    },
    youtubeVideos: [
      {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Featured clip",
        description: "Test video",
      },
    ],
    avatarFile: null,
    avatarPreview: null,
    setDisplayName: noopDispatch<string>(),
    setProfile: noopDispatch<string>(),
    setExternalUrl: noopDispatch<string>(),
    setThemeColor: noopDispatch<string>(),
    setCreatorType: noopDispatch<CreatorReadyWorkspaceState["creatorType"]>(),
    setEcosystemRole: noopDispatch<CreatorReadyWorkspaceState["ecosystemRole"]>(),
    setPublicPage: noopDispatch<CreatorReadyWorkspaceState["publicPage"]>(),
    setSocials: noopDispatch<CreatorReadyWorkspaceState["socials"]>(),
    setYoutubeVideos: noopDispatch<CreatorReadyWorkspaceState["youtubeVideos"]>(),
    setAvatarFile: noopDispatch<File | null>(),
    setAvatarPreview: noopDispatch<string | null>(),
    saving: false,
    onSubmitProfile: () => undefined,
    projectIdsByCurrency: {
      JPYC: "project-1",
      USDC: null,
    },
    onActiveProjectIdChange: () => undefined,
    openSections: {
      about: true,
      wallet: true,
      jpyc: true,
      flow: true,
      gas: true,
      project: true,
      supporter: true,
      posting: true,
    },
    onToggleSection: () => undefined,
    initialAiOfficeUrlState: undefined,
    reportGrowthEvent: () => undefined,
    localGrowthMilestones: {
      publicPageViewedByOwner: false,
      shareDraftsGenerated: false,
    },
    markLocalGrowthMilestone: () => undefined,
    aiSetupDraft: {
      goalTitle: null,
      projectTitle: "",
      projectDescription: "",
      goalTargetInput: "",
    },
    aiSetupDraftVersion: 0,
    applyAiProfileDraft: () => undefined,
    ...overrides,
  };
}

describe("CreatorProfileViewCard", () => {
  it("renders profile details and socials", () => {
    render(
      <CreatorReadyWorkspaceProvider value={buildWorkspaceState()}>
        <CreatorProfileViewCard />
      </CreatorReadyWorkspaceProvider>
    );

    expect(screen.getByText("Test Creator")).toBeVisible();
    expect(screen.getByText("Profile text")).toBeVisible();
    expect(screen.getByText(/Web: https:\/\/example.com/)).toBeVisible();
    expect(screen.getByText(/X: https:\/\/x.com\/testcreator/)).toBeVisible();
    expect(screen.getByText(/Featured clip:/)).toBeVisible();
  });

  it("fires the edit callback", async () => {
    const user = userEvent.setup();
    const onStartEditProfile = vi.fn();

    render(
      <CreatorReadyWorkspaceProvider
        value={buildWorkspaceState({ onStartEditProfile })}
      >
        <CreatorProfileViewCard />
      </CreatorReadyWorkspaceProvider>
    );

    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(onStartEditProfile).toHaveBeenCalledTimes(1);
  });
});
