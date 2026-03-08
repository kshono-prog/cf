"use client";

import React from "react";
import type { Address } from "viem";

import type {
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";
import type {
  SummaryResponseOk,
  UiMsg,
  CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";
import type {
  OpenSections,
  SectionKey,
} from "@/components/mypage/MyPageAccordion";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { CreatorProjectManagementSection } from "@/components/mypage/CreatorProjectManagementSection";
import { GasSupportTabs } from "@/components/mypage/GasSupportTabs";
import type { SummaryActionsSectionProps } from "@/components/mypage/SummaryActionsSection";

type Props = {
  meCreatorUsername: string;
  eventBaseUrl: string;
  themeColor: string;
  error: string | null;
  openSections: OpenSections;
  onToggleSection: (key: SectionKey) => void;
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
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
  summary: SummaryResponseOk | null;
  summaryLoading: boolean;
  msg: UiMsg | null;
  showSummaryActions: boolean;
  refreshSummary: () => Promise<void>;
  planText: string;
  setPlanText: React.Dispatch<React.SetStateAction<string>>;
  txHashesText: string;
  setTxHashesText: React.Dispatch<React.SetStateAction<string>>;
  currency: CurrencyCode;
  setCurrency: React.Dispatch<React.SetStateAction<CurrencyCode>>;
  distChainId: number;
  setDistChainId: React.Dispatch<React.SetStateAction<number>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  canSavePlan: boolean;
  canSaveDistResult: boolean;
  canBridge: boolean;
  isOwner: boolean;
  doSavePlan: () => Promise<void>;
  doSaveDistributionResult: () => Promise<void>;
  onBridged: () => Promise<void>;
};

export function CreatorReadyAccountView(props: Props) {
  const promoHeaderColor = props.themeColor || "#005bbb";
  const summaryActionsProps: SummaryActionsSectionProps = {
    localProjectId: props.localProjectId,
    summary: props.summary,
    summaryLoading: props.summaryLoading,
    msg: props.msg,
    refreshSummary: props.refreshSummary,
    planText: props.planText,
    setPlanText: props.setPlanText,
    txHashesText: props.txHashesText,
    setTxHashesText: props.setTxHashesText,
    currency: props.currency,
    setCurrency: props.setCurrency,
    distChainId: props.distChainId,
    setDistChainId: props.setDistChainId,
    note: props.note,
    setNote: props.setNote,
    canSavePlan: props.canSavePlan,
    canSaveDistResult: props.canSaveDistResult,
    canBridge: props.canBridge,
    isOwner: props.isOwner,
    doSavePlan: props.doSavePlan,
    doSaveDistributionResult: props.doSaveDistributionResult,
    onBridged: props.onBridged,
  };

  return (
    <MyPageShell headerColor={promoHeaderColor}>
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">クリエイター管理</h1>
        {props.error && (
          <div className="alert-warn">
            <p className="text-xs">{props.error}</p>
          </div>
        )}

        <MyPageAccordion
          open={props.openSections}
          onToggle={props.onToggleSection}
          sectionKey="flow"
          title="リンク"
        >
          <CreatorPublicLinkSection
            username={props.meCreatorUsername}
            localProjectId={props.localProjectId}
          />
        </MyPageAccordion>

        <MyPageAccordion
          open={props.openSections}
          onToggle={props.onToggleSection}
          sectionKey="gas"
          title="ガス代支援"
        >
          <GasSupportTabs />
        </MyPageAccordion>

        <MyPageAccordion
          open={props.openSections}
          onToggle={props.onToggleSection}
          sectionKey="project"
          title="プロフィール・目標の編集（Project / Goal / Summary 統合）"
        >
          <CreatorProjectManagementSection
            meCreatorUsername={props.meCreatorUsername}
            eventBaseUrl={props.eventBaseUrl}
            editingProfile={props.editingProfile}
            onStartEditProfile={props.onStartEditProfile}
            onCancelEditProfile={props.onCancelEditProfile}
            displayName={props.displayName}
            profile={props.profile}
            avatarUrl={props.avatarUrl}
            themeColorValue={props.themeColorValue}
            socials={props.socials}
            youtubeVideos={props.youtubeVideos}
            avatarFile={props.avatarFile}
            avatarPreview={props.avatarPreview}
            setDisplayName={props.setDisplayName}
            setProfile={props.setProfile}
            setThemeColor={props.setThemeColor}
            setSocials={props.setSocials}
            setYoutubeVideos={props.setYoutubeVideos}
            setAvatarFile={props.setAvatarFile}
            setAvatarPreview={props.setAvatarPreview}
            saving={props.saving}
            onSubmitProfile={props.onSubmitProfile}
            address={props.address}
            isConnected={props.isConnected}
            localProjectId={props.localProjectId}
            projectIdsByCurrency={props.projectIdsByCurrency}
            projectDashboardsByCurrency={props.projectDashboardsByCurrency}
            onActiveProjectIdChange={props.onActiveProjectIdChange}
            showSummaryActions={props.showSummaryActions}
            summaryActionsProps={summaryActionsProps}
          />
        </MyPageAccordion>
      </div>
    </MyPageShell>
  );
}
