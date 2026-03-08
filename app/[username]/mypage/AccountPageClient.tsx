"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import type { CreatorProfile } from "@/types/creator";

import type { MeStatus, Status } from "@/lib/mypage/types";
import type {
  CurrencyCode,
  GoalDraftByCurrency,
  SummaryResponseOk,
  SummaryViewData,
  UiMsg,
} from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";
import { generateRandomId } from "@/lib/mypage/helpers";

import {
  fetchMyPageDashboard,
  requestCreatorApply,
  saveMyPageUser,
  updateMyPageCreatorProfile,
} from "@/lib/mypage/api";

import { CreatorReadyAccountView } from "@/components/mypage/CreatorReadyAccountView";
import { LoadingMyPageView } from "@/components/mypage/LoadingMyPageView";
import { NoUserMyPageView } from "@/components/mypage/NoUserMyPageView";
import { UnconnectedMyPageView } from "@/components/mypage/UnconnectedMyPageView";
import { UserOnlyMyPageView } from "@/components/mypage/UserOnlyMyPageView";
import { useMyPageSummaryActions } from "@/components/mypage/useMyPageSummaryActions";
import { useMyPageProfileState } from "@/components/mypage/useMyPageProfileState";
import { useMyPageShellState } from "@/components/mypage/useMyPageShellState";

const SHOW_SUMMARY_ACTIONS = false;

/* =========================
   Guards (no any)
========================= */

function safeJsonStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

type Props = {
  username: string;
};

export default function AccountPageClient({ username }: Props) {
  const { address, isConnected } = useAccount();

  const API_BASE = "";

  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeStatus | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const generatedUsername = useMemo(
    () => `user_${generateRandomId()}`,
    []
  );
  const {
    openSections,
    setOpenSections,
    toggleSection,
  } = useMyPageShellState();
  const {
    displayName,
    setDisplayName,
    profile,
    setProfile,
    avatarUrl,
    themeColor,
    setThemeColor,
    avatarFile,
    setAvatarFile,
    avatarPreview,
    setAvatarPreview,
    socials,
    setSocials,
    youtubeVideos,
    setYoutubeVideos,
    editingProfile,
    startEditingProfile,
    cancelEditingProfile,
    usernameInput,
    setUsernameInput,
    resetProfileState,
    applyUserOnly,
    applyCreatorProfile,
  } = useMyPageProfileState(generatedUsername);

  const [localProjectId, setLocalProjectId] = useState<string | null>(null);
  const [projectIdsByCurrency, setProjectIdsByCurrency] = useState<{
    JPYC: string | null;
    USDC: string | null;
  }>({ JPYC: null, USDC: null });
  const [projectDashboardsByCurrency, setProjectDashboardsByCurrency] = useState<{
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  }>({ JPYC: null, USDC: null });

  // ============================
  // Goal upsert（ProjectのGoalテーブル：①の入力）
  // ============================
  const [, setGoalDraftByCurrency] =
    useState<GoalDraftByCurrency>({
      JPYC: { targetInput: "", deadlineInput: "", msg: null },
      USDC: { targetInput: "", deadlineInput: "", msg: null },
    });

  // ============================
  // Summary + actions（①の入力）
  // ============================
  const [summary, setSummary] = useState<SummaryResponseOk | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<UiMsg | null>(null);

  const [planText, setPlanText] = useState<string>("");
  const [txHashesText, setTxHashesText] = useState<string>("[]");
  const [currency, setCurrency] = useState<CurrencyCode>("JPYC");
  const [distChainId, setDistChainId] = useState<number>(43114);
  const [note, setNote] = useState<string>("");

  const applySummaryState = useCallback(
    (
      view: SummaryViewData | null,
      options?: { preserveDraftInputs?: boolean }
    ) => {
      if (!view) {
        setSummary(null);
        setMsg(null);
        if (!options?.preserveDraftInputs) {
          setPlanText("");
          setTxHashesText("[]");
        }
        return;
      }

      const ok: SummaryResponseOk = { ok: true, ...view };
      setSummary(ok);
      setMsg(null);

      const planStr = safeJsonStringify(ok.distributionPlan ?? {});
      if (options?.preserveDraftInputs) {
        setPlanText((prev) => (prev.trim() ? prev : planStr));
      } else {
        setPlanText(planStr);
      }

      const last = ok.lastDistributionRuns?.[0];
      const txStr = last ? safeJsonStringify(last.txHashes ?? []) : "[]";
      if (options?.preserveDraftInputs) {
        setTxHashesText((prev) => (prev.trim() ? prev : txStr));
      } else {
        setTxHashesText(txStr);
      }

      if (ok.goal) {
        const goalCurrency: CurrencyCode =
          ok.project.currency === "USDC" ? "USDC" : "JPYC";
        setGoalDraftByCurrency((prev) => ({
          ...prev,
          [goalCurrency]: {
            ...prev[goalCurrency],
            targetInput: String(ok.goal?.targetAmount ?? ok.goal?.targetAmountJpyc),
            deadlineInput: ok.goal?.deadline
              ? ok.goal.deadline.slice(0, 10)
              : "",
          },
        }));
      }
    },
    []
  );

  const pickProjectIdForCurrency = useCallback(
    (data: MeStatus): string | null => {
      const m = data.projectIdsByCurrency;
      if (m) {
        const v = m[currency];
        if (typeof v === "string" && v) return v;
      }
      return typeof data.projectId === "string" ? data.projectId : null;
    },
    [currency]
  );

  const ownerLower = useMemo(() => {
    if (!summary?.project.ownerAddress) return null;
    return summary.project.ownerAddress.toLowerCase();
  }, [summary?.project.ownerAddress]);

  const connectedLower = useMemo(() => {
    return address ? address.toLowerCase() : null;
  }, [address]);

  const isOwner = useMemo(() => {
    if (!ownerLower || !connectedLower) return false;
    return ownerLower === connectedLower;
  }, [ownerLower, connectedLower]);

  const goalAchieved = !!summary?.goal?.achievedAt;
  const bridgeDone =
    summary?.project.status === "BRIDGED" && !!summary.project.bridgedAt;

  const canBridge =
    isOwner && goalAchieved && summary?.project.status !== "DISTRIBUTED";

  const canSavePlan = isOwner;
  const canSaveDistResult = isOwner && bridgeDone;

  useEffect(() => {
    const next = projectIdsByCurrency[currency] ?? null;
    if (next !== localProjectId) setLocalProjectId(next);
  }, [currency, projectIdsByCurrency, localProjectId]);

  const applyDashboardData = useCallback(
    (data: {
      me: MeStatus;
      selectedProjectId: string | null;
      projectsByCurrency: {
        JPYC: MyPageProjectDashboard | null;
        USDC: MyPageProjectDashboard | null;
      };
    }) => {
      const meData = data.me;
      setMe(meData);
      setProjectDashboardsByCurrency(data.projectsByCurrency);
      const nextProjectIds =
        meData.projectIdsByCurrency ?? { JPYC: null, USDC: null };
      setProjectIdsByCurrency(nextProjectIds);

      const nextSelectedProjectId =
        data.selectedProjectId ?? pickProjectIdForCurrency(meData);
      setLocalProjectId(nextSelectedProjectId);

      const selectedDashboard =
        data.projectsByCurrency.JPYC?.projectId === nextSelectedProjectId
          ? data.projectsByCurrency.JPYC
          : data.projectsByCurrency.USDC?.projectId === nextSelectedProjectId
            ? data.projectsByCurrency.USDC
            : null;
      applySummaryState(selectedDashboard?.summary ?? null);

      if (!meData.hasUser) {
        setStatus("noUser");
        resetProfileState(username);
        return;
      }

      if (meData.hasUser && !meData.hasCreator) {
        setStatus("userOnly");
        applyUserOnly(meData.user, username);
        return;
      }

      setStatus("creatorReady");

      const cp = meData.creator as CreatorProfile | null;
      if (!cp) {
        setStatus("userOnly");
        applyUserOnly(meData.user, username);
        return;
      }
      applyCreatorProfile(cp, meData.user, username);
    },
    [
      applyCreatorProfile,
      applySummaryState,
      applyUserOnly,
      pickProjectIdForCurrency,
      resetProfileState,
      username,
    ]
  );

  const loadDashboard = useCallback(
    async (addr: Address): Promise<boolean> => {
      const result = await fetchMyPageDashboard({
        apiBase: API_BASE,
        address: addr,
      });

      if (!result.ok) {
        setError(
          "サーバーエラーが発生しました。時間をおいて再度お試しください。"
        );
        return false;
      }

      applyDashboardData(result.data);
      return true;
    },
    [API_BASE, applyDashboardData]
  );

  const { refreshSummary, doSavePlan, doSaveDistributionResult } =
    useMyPageSummaryActions({
      projectId: localProjectId,
      address,
      planText,
      txHashesText,
      currency,
      distChainId,
      note,
      applySummaryState,
      setSummaryLoading,
      setMsg,
    });

  // /api/me から projectId + creator profile をstateへ
  useEffect(() => {
    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      setProjectIdsByCurrency({ JPYC: null, USDC: null });
      setProjectDashboardsByCurrency({ JPYC: null, USDC: null });
      applySummaryState(null);
      resetProfileState(username);
      return;
    }

    const addr: Address = address;
    let cancelled = false;

    async function run(): Promise<void> {
      setStatus("loading");
      setError(null);
      const ok = await loadDashboard(addr);
      if (cancelled || ok) return;
      setStatus("loading");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, loadDashboard, applySummaryState, resetProfileState, username]);

  // /api/user
  async function handleSaveUser(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const slug = usernameInput.trim() || username;
      const result = await saveMyPageUser({
        apiBase: API_BASE,
        address: addr,
        username: slug,
        displayName: displayName.trim(),
        profile: profile.trim(),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadDashboard(addr);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "ユーザー情報の保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  // /api/creator/apply
  async function handleApplyCreator(): Promise<void> {
    if (!address) return;
    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const result = await requestCreatorApply({
        apiBase: API_BASE,
        address: addr,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadDashboard(addr);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "クリエイター申請に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================
  // Creator Profile Save（②の保存）
  // ============================
  async function handleSaveCreatorProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    setSaving(true);
    setError(null);

    try {
      const result = await updateMyPageCreatorProfile({
        displayName: displayName.trim(),
        profile: profile.trim(),
        address,
        avatarUrl,
        themeColor,
        socials,
        youtubeVideos,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadDashboard(address);

      cancelEditingProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CREATOR_UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  // creatorReady になって、projectId があるなら summary を自動取得
  useEffect(() => {
    if (status !== "creatorReady") return;
    if (!localProjectId) return;
    if (summary?.project.id === localProjectId) return;
    void refreshSummary();
  }, [status, localProjectId, refreshSummary, summary?.project.id]);

  // ==================================================
  // UI
  // ==================================================
  const promoHeaderColor = themeColor || "#005bbb";

  if (status === "loading") {
    return <LoadingMyPageView headerColor={promoHeaderColor} />;
  }

  if (status === "unconnected") {
    return (
      <UnconnectedMyPageView
        headerColor={promoHeaderColor}
        error={error}
        openSections={openSections}
        setOpenSections={setOpenSections}
      />
    );
  }

  if (status === "noUser") {
    return (
      <NoUserMyPageView
        headerColor={promoHeaderColor}
        error={error}
        usernameInput={usernameInput}
        displayName={displayName}
        profile={profile}
        setUsernameInput={setUsernameInput}
        setDisplayName={setDisplayName}
        setProfile={setProfile}
        saving={saving}
        onSubmit={handleSaveUser}
      />
    );
  }

  if (status === "userOnly") {
    return (
      <UserOnlyMyPageView
        headerColor={promoHeaderColor}
        error={error}
        openSections={openSections}
        onToggleSection={toggleSection}
        userDisplayName={me?.user?.displayName}
        userProfile={me?.user?.profile}
        displayName={displayName}
        profile={profile}
        setDisplayName={setDisplayName}
        setProfile={setProfile}
        saving={saving}
        onSubmit={handleSaveUser}
        onApply={() => void handleApplyCreator()}
      />
    );
  }

  // creatorReady
  const creatorUsername = me?.creator?.username ?? username;
  const eventBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(
    /\/$/,
    ""
  );

  return (
    <CreatorReadyAccountView
      meCreatorUsername={creatorUsername}
      eventBaseUrl={eventBaseUrl}
      themeColor={themeColor}
      error={error}
      openSections={openSections}
      onToggleSection={toggleSection}
      localProjectId={localProjectId}
      address={address}
      isConnected={isConnected}
      editingProfile={editingProfile}
      onStartEditProfile={startEditingProfile}
      onCancelEditProfile={cancelEditingProfile}
      displayName={displayName}
      profile={profile}
      avatarUrl={avatarUrl}
      themeColorValue={themeColor}
      socials={socials}
      youtubeVideos={youtubeVideos}
      avatarFile={avatarFile}
      avatarPreview={avatarPreview}
      setDisplayName={setDisplayName}
      setProfile={setProfile}
      setThemeColor={setThemeColor}
      setSocials={setSocials}
      setYoutubeVideos={setYoutubeVideos}
      setAvatarFile={setAvatarFile}
      setAvatarPreview={setAvatarPreview}
      saving={saving}
      onSubmitProfile={(e) => void handleSaveCreatorProfile(e)}
      projectIdsByCurrency={projectIdsByCurrency}
      onActiveProjectIdChange={(pid, changedCur) => {
        setProjectIdsByCurrency((prev) => ({
          ...prev,
          [changedCur]: pid,
        }));
        setProjectDashboardsByCurrency((prev) => ({
          ...prev,
          [changedCur]: null,
        }));
        setCurrency(changedCur);
        setLocalProjectId(pid);
        applySummaryState(null);
        setMsg(null);
        setGoalDraftByCurrency((prev) => ({
          ...prev,
          [changedCur]: { ...prev[changedCur], msg: null },
        }));
      }}
      projectDashboardsByCurrency={projectDashboardsByCurrency}
      summary={summary}
      summaryLoading={summaryLoading}
      msg={msg}
      showSummaryActions={SHOW_SUMMARY_ACTIONS}
      refreshSummary={refreshSummary}
      planText={planText}
      setPlanText={setPlanText}
      txHashesText={txHashesText}
      setTxHashesText={setTxHashesText}
      currency={currency}
      setCurrency={setCurrency}
      distChainId={distChainId}
      setDistChainId={setDistChainId}
      note={note}
      setNote={setNote}
      canSavePlan={canSavePlan}
      canSaveDistResult={canSaveDistResult}
      canBridge={canBridge}
      isOwner={isOwner}
      doSavePlan={doSavePlan}
      doSaveDistributionResult={doSaveDistributionResult}
      onBridged={refreshSummary}
    />
  );
}
