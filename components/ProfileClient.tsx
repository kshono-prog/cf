"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import type { CreatorProfile } from "@/lib/profileTypes";
import { autoReverifyPending, postReverify } from "@/lib/reverifyClient";
import {
  clampPct,
  getErrorMessage,
  type Currency,
} from "@/components/profile/profileClientHelpers";
import {
  isRecord,
  pickPublicSummaryLite,
  type PublicSummaryLite,
} from "@/lib/publicSummary";
import { CreatorFeedSection } from "@/components/feed/CreatorFeedSection";
import type { SelectedPostTipContext } from "@/components/feed/feedTypes";
import { PublicOwnerComposerCard } from "@/components/profile/PublicOwnerComposerCard";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { SupportSheet } from "@/components/support/SupportSheet";
import { CreatorCommunityCard } from "@/components/profile/CreatorCommunityCard";

const ProfileWalletClient = dynamic(
  () =>
    import("@/components/profile/ProfileWalletClient").then(
      (module) => module.ProfileWalletClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        ウォレット情報を準備しています…
      </div>
    ),
  }
);

type PublicCreatorResponse =
  | {
      ok: true;
      summary: unknown | null;
    }
  | { ok: false; error: string; detail?: string };

type CreatorProfileInput = Omit<CreatorProfile, "address"> & {
  address?: string | null;
};

type Props = {
  username: string;
  creator: CreatorProfileInput;
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  publicSummary?: PublicSummaryLite | null;
  layout?: "full" | "content";
  screen?: "profile" | "home";
};

type ProgressSupportedChainIdsByCurrency = {
  JPYC: number[];
  USDC: number[];
};

type ProgressByChainRow = {
  chainId: number;
  confirmedAmountDecimal: string | null;
  confirmedAmountJpyc: number;
};

type PurposeDto = { id: string; title?: string | null };

type ProjectProgressApi = {
  ok: true;
  project: { id: string; status: string; title?: string | null };
  goal: {
    id: string;
    unitCurrency?: Currency;
    targetAmount?: number;
    targetAmountJpyc: number;
    achievedAt: string | null;
    deadline?: string | null;
  } | null;
  progress: {
    currency?: Currency;
    confirmedJpyc: number;
    confirmedTotal?: number;
    confirmedByCurrency?: {
      JPYC: number;
      USDC: number;
    };
    targetAmount?: number | null;
    targetJpyc: number | null;
    progressPct: number;
    supportedChainIds?: number[];
    supportedJpycChainIds: number[];
    supportedChainIdsByCurrency?: ProgressSupportedChainIdsByCurrency;
    byChain: ProgressByChainRow[];
    byChainByCurrency?: {
      JPYC: ProgressByChainRow[];
      USDC: ProgressByChainRow[];
    };
    totalsAllChains: {
      JPYC: string | null;
      USDC: string | null;
    };
    perPurpose: Array<{
      purposeId: string;
      code: string | null;
      label: string | null;
      description: string | null;
      confirmedAmountDecimal: string | null;
      confirmedAmountJpyc: number;
    }>;
    noPurposeConfirmedJpyc: number;
  };
  purposes: PurposeDto[];
};

type GoalAchievePost = {
  ok: true;
  achieved: boolean;
  alreadyAchieved?: boolean;
  reason?: string;
  project?: unknown;
  goal?: unknown;
  progress?: unknown;
};

function formatSupportAmount(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return currency === "USDC" ? "0.00" : "0";
  if (currency === "USDC") {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return Math.floor(value).toLocaleString();
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : "";
}

export default function ProfileClient({
  username,
  creator: creatorInput,
  projectId,
  projectIdsByCurrency,
  publicSummary,
  layout = "full",
  screen = "profile",
}: Props) {
  const { address: viewerAddress } = useAccount();
  const creator: CreatorProfile = useMemo(() => {
    const normalizedAddress =
      typeof creatorInput.address === "string" && creatorInput.address.length > 0
        ? creatorInput.address
        : undefined;

    return {
      ...(creatorInput as Omit<CreatorProfile, "address">),
      address: normalizedAddress,
    };
  }, [creatorInput]);

  const [viewCurrency, setViewCurrency] = useState<Currency>("JPYC");
  const resolvedProjectIdsByCurrency = useMemo(
    () => ({
      JPYC: projectIdsByCurrency?.JPYC ?? projectId ?? null,
      USDC: projectIdsByCurrency?.USDC ?? null,
    }),
    [projectId, projectIdsByCurrency]
  );
  const activeProjectId = resolvedProjectIdsByCurrency[viewCurrency];
  const publicSummaryFetchRef = useRef<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const reverifyOnViewBusyRef = useRef(false);
  const attemptedThisViewRef = useRef<{ set: Set<string> }>({
    set: new Set<string>(),
  });

  const [publicSummaryState, setPublicSummaryState] =
    useState<PublicSummaryLite | null>(publicSummary ?? null);
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);
  const [selectedPostTipContext, setSelectedPostTipContext] =
    useState<SelectedPostTipContext | null>(null);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const [supportSheetLoaded, setSupportSheetLoaded] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressTotalYen, setProgressTotalYen] = useState<number | null>(null);
  const [progressTargetYen, setProgressTargetYen] = useState<number | null>(null);
  const [goalAchievedAt, setGoalAchievedAt] = useState<string | null>(null);
  const [supportedJpycChainIds, setSupportedJpycChainIds] = useState<number[]>(
    []
  );
  const [supportedChainIdsByCurrency, setSupportedChainIdsByCurrency] =
    useState<ProgressSupportedChainIdsByCurrency>({
      JPYC: [],
      USDC: [],
    });
  const [projectGoalTargetYen, setProjectGoalTargetYen] = useState<
    number | null
  >(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [autoReverifyRunning, setAutoReverifyRunning] = useState(false);

  useEffect(() => {
    if (resolvedProjectIdsByCurrency[viewCurrency]) return;
    if (resolvedProjectIdsByCurrency.JPYC) {
      setViewCurrency("JPYC");
      return;
    }
    if (resolvedProjectIdsByCurrency.USDC) {
      setViewCurrency("USDC");
    }
  }, [resolvedProjectIdsByCurrency, viewCurrency]);

  useEffect(() => {
    if (publicSummary !== undefined) {
      setPublicSummaryState(publicSummary);
      return;
    }

    if (publicSummaryFetchRef.current === username) return;
    publicSummaryFetchRef.current = username;

    let cancelled = false;

    async function fetchPublicSummary(): Promise<void> {
      try {
        const response = await fetch(
          `/api/public/creator?username=${encodeURIComponent(username)}`,
          {
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);
        if (!cancelled && response.ok && isRecord(json) && json.ok === true) {
          const result = json as Extract<PublicCreatorResponse, { ok: true }>;
          setPublicSummaryState(
            result.summary ? pickPublicSummaryLite(result.summary) : null
          );
        }
      } catch {
        if (!cancelled) {
          setPublicSummaryState(null);
        }
      }
    }

    void fetchPublicSummary();

    return () => {
      cancelled = true;
    };
  }, [publicSummary, username]);

  useEffect(() => {
    if (!viewerAddress) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = viewerAddress;
    let cancelled = false;

    async function fetchViewerIdentity(): Promise<void> {
      setViewerIdentityResolved(false);
      try {
        const response = await fetch(
          `/api/me?address=${encodeURIComponent(connectedAddress)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);
        if (!cancelled) {
          setViewerIdentity(
            response.ok ? parsePublicViewerMeResponse(json) : null
          );
        }
      } catch {
        if (!cancelled) {
          setViewerIdentity(null);
        }
      } finally {
        if (!cancelled) {
          setViewerIdentityResolved(true);
        }
      }
    }

    void fetchViewerIdentity();

    return () => {
      cancelled = true;
    };
  }, [viewerAddress]);

  const fetchProjectProgressSafe = useCallback(async (): Promise<ProjectProgressApi | null> => {
    if (!activeProjectId) return null;

    setProgressLoading(true);
    setProgressError(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}/progress`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("うまく読み込めませんでした");
      }

      const json = (await response.json()) as unknown;

      if (
        !isRecord(json) ||
        json.ok !== true ||
        !isRecord(json.project) ||
        !isRecord(json.progress)
      ) {
        throw new Error("うまく読み込めませんでした");
      }

      const typed = json as ProjectProgressApi;
      const confirmed = Number(
        typed.progress.confirmedTotal ?? typed.progress.confirmedJpyc ?? 0
      );
      const target =
        typed.progress.targetAmount ?? typed.progress.targetJpyc ?? null;
      const idsLegacy = Array.isArray(typed.progress.supportedJpycChainIds)
        ? typed.progress.supportedJpycChainIds.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          )
        : [];
      const idsAll = Array.isArray(typed.progress.supportedChainIds)
        ? typed.progress.supportedChainIds.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          )
        : [];

      setProjectTitle(
        typeof typed.project.title === "string" && typed.project.title.length > 0
          ? typed.project.title
          : null
      );
      setProgressTotalYen(Number.isFinite(confirmed) ? confirmed : 0);
      setProgressTargetYen(
        typeof target === "number" && Number.isFinite(target) ? target : null
      );
      setGoalAchievedAt(typed.goal?.achievedAt ?? null);
      setSupportedJpycChainIds(idsAll.length > 0 ? idsAll : idsLegacy);

      const byCurrency = typed.progress.supportedChainIdsByCurrency;
      if (
        isRecord(byCurrency) &&
        Array.isArray(byCurrency.JPYC) &&
        Array.isArray(byCurrency.USDC)
      ) {
        setSupportedChainIdsByCurrency({
          JPYC: byCurrency.JPYC.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          ),
          USDC: byCurrency.USDC.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          ),
        });
      } else {
        setSupportedChainIdsByCurrency({ JPYC: idsLegacy, USDC: [] });
      }

      const goalTarget = typed.goal?.targetAmount ?? typed.goal?.targetAmountJpyc;
      if (goalTarget != null) {
        setProjectGoalTargetYen(goalTarget);
      }

      return typed;
    } catch (error) {
      setProgressError(getErrorMessage(error));
      return null;
    } finally {
      setProgressLoading(false);
    }
  }, [activeProjectId]);

  async function achieveGoalSafe(): Promise<GoalAchievePost | null> {
    if (!activeProjectId) return null;

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}/goal/achieve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        return null;
      }

      const result = (await response.json()) as GoalAchievePost;
      await fetchProjectProgressSafe();
      return result;
    } catch {
      return null;
    }
  }

  const fetchPendingTxHashesSafe = useCallback(async (): Promise<`0x${string}`[]> => {
    if (!activeProjectId) return [];

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}/contributions?status=PENDING`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      if (!response.ok) return [];
      const json: unknown = await response.json().catch(() => null);
      if (!isRecord(json) || json.ok !== true || !Array.isArray(json.items)) {
        return [];
      }

      return json.items
        .filter((row): row is Record<string, unknown> => isRecord(row))
        .map((row) => row.txHash)
        .filter(
          (txHash): txHash is `0x${string}` =>
            typeof txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(txHash)
        );
    } catch {
      return [];
    }
  }, [activeProjectId]);

  const autoReverifyPendingOnView = useCallback(async (): Promise<void> => {
    if (!activeProjectId) return;
    if (reverifyOnViewBusyRef.current) return;

    reverifyOnViewBusyRef.current = true;
    try {
      const result = await autoReverifyPending({
        projectId: activeProjectId,
        cooldownMs: 60_000,
        maxPerView: 3,
      });

      if (result.verified.length > 0) {
        await fetchProjectProgressSafe();
      }
    } finally {
      reverifyOnViewBusyRef.current = false;
    }
  }, [activeProjectId, fetchProjectProgressSafe]);

  useEffect(() => {
    if (!activeProjectId) return;

    attemptedThisViewRef.current.set.clear();
    void fetchProjectProgressSafe();
    void autoReverifyPendingOnView();
  }, [activeProjectId, autoReverifyPendingOnView, fetchProjectProgressSafe]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (progressLoading || autoReverifyRunning) return;

    let cancelled = false;
    const keyPrefix = "cf:reverify:lastAttempt:";
    const maxPerLoad = 5;
    const cooldownMs = 20_000;

    function getLastAttempt(txHash: string): number {
      try {
        const value = localStorage.getItem(keyPrefix + txHash);
        if (!value) return 0;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      } catch {
        return 0;
      }
    }

    function setLastAttempt(txHash: string, value: number) {
      try {
        localStorage.setItem(keyPrefix + txHash, String(value));
      } catch {
        // ignore storage errors
      }
    }

    async function run(): Promise<void> {
      setAutoReverifyRunning(true);
      try {
        const pending = await fetchPendingTxHashesSafe();
        if (cancelled || pending.length === 0) return;

        const now = Date.now();
        const candidates: `0x${string}`[] = [];

        for (const txHash of pending) {
          if (attemptedThisViewRef.current.set.has(txHash)) continue;
          if (now - getLastAttempt(txHash) < cooldownMs) continue;

          candidates.push(txHash);
          if (candidates.length >= maxPerLoad) break;
        }

        if (candidates.length === 0) return;

        for (const txHash of candidates) {
          attemptedThisViewRef.current.set.add(txHash);
          setLastAttempt(txHash, now);
        }

        let anyConfirmed = false;
        for (const txHash of candidates) {
          if (cancelled) return;
          const result = await postReverify(txHash);
          if (result.verified === true) {
            anyConfirmed = true;
          }
        }

        if (anyConfirmed && !cancelled) {
          await fetchProjectProgressSafe();
        }
      } finally {
        if (!cancelled) {
          setAutoReverifyRunning(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    activeProjectId,
    autoReverifyRunning,
    fetchPendingTxHashesSafe,
    fetchProjectProgressSafe,
    progressLoading,
    progressTotalYen,
  ]);

  async function postContribution(args: {
    projectId?: string;
    purposeId?: string;
    postId?: string;
    chainId: number;
    currency: Currency;
    tokenAddress: string;
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
  }): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!args.projectId) return { ok: false, reason: "PROJECT_ID_MISSING" };

    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          projectId: String(args.projectId),
          ...(args.purposeId === undefined
            ? {}
            : {
                purposeId:
                  args.purposeId === null ? null : String(args.purposeId),
              }),
          ...(args.postId ? { postId: args.postId } : {}),
          chainId: args.chainId,
          currency: args.currency,
          txHash: args.txHash,
          fromAddress: args.fromAddress,
          toAddress: args.toAddress,
          amount: String(args.amount),
        }),
      });

      if (!response.ok) {
        return { ok: false, reason: `HTTP_${response.status}` };
      }

      return { ok: true };
    } catch {
      return { ok: false, reason: "FETCH_FAILED" };
    }
  }

  async function afterSendPipeline(txHash: string, postId?: string | null) {
    if (!activeProjectId) return;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await postReverify(txHash as `0x${string}`);
      if (result.verified === true) break;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    const progress = await fetchProjectProgressSafe();
    const achievedAt =
      (progress?.goal?.achievedAt && progress.goal.achievedAt.length > 0
        ? progress.goal.achievedAt
        : null) ?? goalAchievedAt;
    const targetRaw =
      progress?.progress.targetAmount ?? progress?.progress.targetJpyc ?? null;
    const confirmedRaw =
      progress?.progress.confirmedTotal ?? progress?.progress.confirmedJpyc ?? 0;
    const target =
      typeof targetRaw === "number" && Number.isFinite(targetRaw)
        ? targetRaw
        : null;
    const confirmed =
      typeof confirmedRaw === "number" && Number.isFinite(confirmedRaw)
        ? confirmedRaw
        : 0;
    const reached = target != null && target > 0 ? confirmed >= target : null;

    if (reached === true && !achievedAt) {
      await achieveGoalSafe();
    }

    const tippedPostId = postId ?? selectedPostTipContext?.id ?? null;
    if (tippedPostId) {
      setFeedRefreshToken((current) => current + 1);
      setSelectedPostTipContext((current) =>
        current?.id === tippedPostId ? null : current
      );
    }
  }

  const viewerState = resolvePublicViewerState({
    pageUsername: username,
    pageCreatorAddress: creator.address ?? null,
    viewerAddress: viewerAddress ?? null,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });

  const resolvedTargetYen =
    progressTargetYen != null ? progressTargetYen : projectGoalTargetYen;
  const hasProject = Boolean(activeProjectId);
  const hasDbGoal =
    hasProject &&
    typeof resolvedTargetYen === "number" &&
    Number.isFinite(resolvedTargetYen) &&
    resolvedTargetYen > 0;
  const hasPublicGoal =
    publicSummaryState?.goal != null && publicSummaryState.progress != null;
  const hasLegacyOnchainGoal = Boolean(
    creator.goalTitle && creator.goalTargetJpyc
  );
  const showDbCard = hasDbGoal;
  const showPublicCard = !showDbCard && hasPublicGoal;
  const showLegacyCard =
    !showDbCard && !showPublicCard ? hasLegacyOnchainGoal : false;
  const displayName = creator.displayName || username;
  const supportTitle =
    projectTitle || creator.goalTitle || `${displayName}の活動を応援する`;
  const supportDescription =
    creator.profile?.trim() ||
    "投稿や活動の近況を見ながら、必要なタイミングで自然に応援できます。";

  const supportOverview = (() => {
    if (
      showDbCard &&
      resolvedTargetYen != null &&
      progressTotalYen != null &&
      resolvedTargetYen > 0
    ) {
      return {
        current: progressTotalYen,
        target: resolvedTargetYen,
        progressPct: clampPct((progressTotalYen / resolvedTargetYen) * 100),
        achievedAt: goalAchievedAt,
        deadline: null,
      };
    }

    if (
      showPublicCard &&
      publicSummaryState?.goal?.targetAmountJpyc &&
      publicSummaryState.progress
    ) {
      return {
        current: publicSummaryState.progress.confirmedJpyc,
        target: publicSummaryState.goal.targetAmountJpyc,
        progressPct: clampPct(publicSummaryState.progress.progressPct),
        achievedAt: publicSummaryState.goal.achievedAt,
        deadline: publicSummaryState.goal.deadline,
      };
    }

    if (showLegacyCard && creator.goalTargetJpyc) {
      return {
        current: 0,
        target: creator.goalTargetJpyc,
        progressPct: 0,
        achievedAt: null,
        deadline: null,
      };
    }

    return null;
  })();

  const ownerProjectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    for (const currency of ["JPYC", "USDC"] as const) {
      const nextId = resolvedProjectIdsByCurrency[currency];
      if (!nextId || seen.has(nextId)) continue;
      seen.add(nextId);

      options.push({
        id: nextId,
        label: `${currency} / ${projectTitle ?? `${currency} の公開ページ`}`,
      });
    }

    return options;
  }, [projectTitle, resolvedProjectIdsByCurrency]);

  function openSupportSheet() {
    setSupportSheetLoaded(true);
    setSupportSheetOpen(true);
  }

  function closeSupportSheet() {
    setSupportSheetOpen(false);
    setSelectedPostTipContext(null);
  }

  function handleSelectPostTip(post: SelectedPostTipContext) {
    setSelectedPostTipContext(post);
    if (post.preferredCurrency) {
      setViewCurrency(post.preferredCurrency);
    }
    openSupportSheet();
  }

  function handleOwnerPostCreated() {
    setFeedRefreshToken((current) => current + 1);
    window.requestAnimationFrame(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const ownerComposerManagementHref = `/${username}/mypage#public-page`;
  const viewerWorkspaceHref = viewerState.userUsername
    ? `/${viewerState.userUsername}/mypage`
    : `/${username}/mypage`;
  const viewerComposeHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}/compose`
    : viewerWorkspaceHref;
  const viewerProfileHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}`
    : viewerWorkspaceHref;
  const pageDisplayName = displayName;
  const availableCurrencies = (["JPYC", "USDC"] as const).filter(
    (currency) => resolvedProjectIdsByCurrency[currency]
  );
  const homeProjectIdsByCurrency = {
    JPYC: null,
    USDC: null,
  } satisfies {
    JPYC: string | null;
    USDC: string | null;
  };

  async function handleViewerConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  const profileGuideCard = (() => {
    if (viewerState.isOwner) {
      return (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">
                これはあなたの公開ページです
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                見え方を確認しながら、投稿や設定をすぐ開けます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={viewerComposeHref} className="btn">
                投稿する
              </Link>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                設定を開く
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (viewerState.mode === "unconnected") {
      return null;
    }

    if (viewerState.mode === "unregistered") {
      return (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">
                応援はできます。投稿したいときはユーザー登録
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                まずは登録すると、自分のページと投稿機能を使い始められます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={openSupportSheet}>
                応援する
              </button>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                ユーザー登録へ
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (!viewerState.hasCreator) {
      return (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">
                自分の公開ページを作ると、投稿も始められます
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                いまは {pageDisplayName} さんのページを見ています。自分のページを整えると、投稿や応援の受け取りも始められます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={openSupportSheet}>
                応援する
              </button>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                設定を開く
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">
              いま見ているのは {pageDisplayName} さんの公開ページです
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              応援したり、気になる投稿を見たりできます。自分のページは別で整えられます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={openSupportSheet}>
              応援する
            </button>
            <Link href={viewerProfileHref} className="btn-secondary">
              自分のページを見る
            </Link>
          </div>
        </div>
      </section>
    );
  })();

  const homeGuideCard = (() => {
    if (viewerState.mode === "loading") {
      return (
        <section className="surface-subtle px-4 py-4 sm:px-5">
          <div className="text-sm font-semibold text-[var(--text)]">
            準備を確認しています
          </div>
          <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
            接続状態と登録状況を読み込み中です。
          </p>
        </section>
      );
    }

    if (viewerState.mode === "unconnected") {
      return null;
    }

    if (viewerState.mode === "unregistered") {
      return (
        <section className="surface-subtle px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                応援はそのままできます。投稿したいときはユーザー登録
              </div>
              <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
                まずは登録すると、自分のページと投稿機能を使い始められます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${username}`} className="btn">
                プロフィールを見る
              </Link>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                ユーザー登録へ
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (!viewerState.hasCreator) {
      return null;
    }

    return (
      <section className="surface-subtle px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              いま見ているのは、みんなの最新投稿です
            </div>
            <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
              気になる投稿に反応しながら流れを見られます。投稿したいときは自分のページへ移動できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={viewerComposeHref} className="btn-secondary">
              自分の投稿画面へ
            </Link>
          </div>
        </div>
      </section>
    );
  })();

  const profileScreen = (
    <div className="space-y-4">
      <ProfileHero
        username={username}
        displayName={displayName}
        avatarUrl={creator.avatarUrl}
        profile={creator.profile}
        externalUrl={creator.url}
        socials={creator.socials}
        communityContent={
          <CreatorCommunityCard
            username={username}
            viewerAddress={viewerAddress ?? null}
            viewerState={viewerState}
            managementHref={ownerComposerManagementHref}
            registrationHref={viewerWorkspaceHref}
            onRequireConnection={() => void handleViewerConnect()}
          />
        }
      />

      {viewerState.mode !== "unconnected" ? profileGuideCard : null}
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">
              いま受け付けている応援
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              このページでいま受け付けている応援の目的と進み具合をまとめています。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewerState.isOwner ? (
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                公開ページを整える
              </Link>
            ) : (
              <button type="button" className="btn" onClick={openSupportSheet}>
                応援する
              </button>
            )}
          </div>
        </div>

        {progressLoading ? (
          <div className="mt-4 text-sm text-[var(--text-subtle)]">読み込み中です</div>
        ) : progressError ? (
          <div className="alert-warn mt-4">
            うまく読み込めませんでした。もう一度お試しください。
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="surface-subtle px-4 py-4">
              <div className="text-sm text-[var(--text-subtle)]">いま集まっている応援</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {supportOverview
                  ? formatSupportAmount(supportOverview.current, viewCurrency)
                  : "-"}
              </div>
              <div className="mt-1 text-xs text-[var(--text-subtle)]">{viewCurrency}</div>
            </div>
            <div className="surface-subtle px-4 py-4">
              <div className="text-sm text-[var(--text-subtle)]">目標</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {supportOverview
                  ? formatSupportAmount(supportOverview.target, viewCurrency)
                  : creator.goalTargetJpyc
                  ? formatSupportAmount(creator.goalTargetJpyc, "JPYC")
                  : "-"}
              </div>
              <div className="mt-1 text-xs text-[var(--text-subtle)]">
                {supportOverview ? viewCurrency : "JPYC"}
              </div>
            </div>
            <div className="surface-subtle px-4 py-4">
              <div className="text-sm text-[var(--text-subtle)]">進捗</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {supportOverview ? `${Math.floor(supportOverview.progressPct)}%` : "-"}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--support)]"
                  style={{
                    width: `${supportOverview ? supportOverview.progressPct : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">いま集めていること</div>
          <div className="mt-2 text-lg font-semibold text-[var(--text)]">
            {supportTitle}
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--text-subtle)]">
            {supportDescription}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">応援の状態</div>
            <div className="mt-2 text-lg font-semibold text-[var(--text)]">
              {supportOverview?.achievedAt ? "目標達成済み" : "応援受付中"}
            </div>
            <div className="mt-1 text-sm text-[var(--text-subtle)]">
              {supportOverview?.deadline
                ? `期限: ${supportOverview.deadline.slice(0, 10)}`
                : supportOverview
                ? `${Math.floor(supportOverview.progressPct)}% 進行中`
                : "公開ページの設定で応援内容を整えられます"}
            </div>
          </div>
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">使える通貨</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableCurrencies.length > 0 ? (
                availableCurrencies.map((currency) => (
                  <span
                    key={currency}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--text)]"
                  >
                    {currency}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--text-subtle)]">未設定</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["JPYC", "USDC"] as const).map((currency) => (
            <button
              key={currency}
              type="button"
              className={`chip-button ${
                viewCurrency === currency
                  ? "border-slate-900 bg-slate-900 text-white"
                  : ""
              }`}
              disabled={!resolvedProjectIdsByCurrency[currency]}
              onClick={() => setViewCurrency(currency)}
            >
              {currency}
            </button>
          ))}
          {viewerState.isOwner ? (
            <Link href={viewerWorkspaceHref} className="btn-secondary">
              設定を開く
            </Link>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={openSupportSheet}
            >
              応援する
            </button>
          )}
        </div>
      </section>

      {creator.youtubeVideos && creator.youtubeVideos.length > 0 ? (
        <section className="surface-card p-5 sm:p-6">
          <div className="text-lg font-semibold text-[var(--text)]">紹介動画</div>
          <div className="mt-4 space-y-5">
            {creator.youtubeVideos.map((video, index) => {
              const videoId = extractYouTubeId(video.url);

              return (
                <div key={`${video.url}-${index}`} className="space-y-3">
                  {videoId ? (
                    <Link href={video.url} target="_blank" rel="noreferrer">
                      <Image
                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                        alt={video.title || "紹介動画"}
                        width={1280}
                        height={720}
                        className="w-full rounded-2xl border border-[var(--line)]"
                      />
                    </Link>
                  ) : null}
                  <div>
                    <div className="text-base font-semibold text-[var(--text)]">
                      {video.title || "紹介動画"}
                    </div>
                    {video.description ? (
                      <p className="mt-2 text-sm leading-7 text-[var(--text-subtle)]">
                        {video.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div id="posts" ref={timelineRef}>
        <CreatorFeedSection
          creatorUsername={username}
          viewerAddress={viewerAddress ?? null}
          managedCreatorUsername={viewerState.creatorUsername}
          managePostAddress={viewerState.hasCreator ? viewerAddress ?? null : null}
          manageProjectOptions={ownerProjectOptions}
          selectedPostId={selectedPostTipContext?.id ?? null}
          projectIdsByCurrency={resolvedProjectIdsByCurrency}
          showTipAction
          refreshToken={feedRefreshToken}
          headerColor={creator.themeColor || "#2563eb"}
          onSelectTipPost={handleSelectPostTip}
          onFocusWalletSection={openSupportSheet}
        />
      </div>

      {viewerState.mode === "unconnected" ? profileGuideCard : null}
    </div>
  );

  const homeScreen = (
    <div className="space-y-4">
      {viewerState.isOwner && viewerAddress ? (
        <PublicOwnerComposerCard
          address={viewerAddress}
          managementHref={ownerComposerManagementHref}
          projectOptions={ownerProjectOptions}
          onCreated={handleOwnerPostCreated}
        />
      ) : (
        homeGuideCard
      )}

      <div id="timeline" ref={timelineRef}>
        <CreatorFeedSection
          creatorUsername={null}
          viewerAddress={viewerAddress ?? null}
          managedCreatorUsername={viewerState.creatorUsername}
          managePostAddress={viewerState.hasCreator ? viewerAddress ?? null : null}
          manageProjectOptions={ownerProjectOptions}
          selectedPostId={selectedPostTipContext?.id ?? null}
          projectIdsByCurrency={homeProjectIdsByCurrency}
          showTipAction={false}
          refreshToken={feedRefreshToken}
          headerColor={creator.themeColor || "#2563eb"}
          onSelectTipPost={handleSelectPostTip}
          onFocusWalletSection={openSupportSheet}
        />
      </div>
    </div>
  );

  const content = (
    <>
      {screen === "home" ? homeScreen : profileScreen}

      <SupportSheet
        open={supportSheetOpen}
        title={selectedPostTipContext ? "この投稿を応援" : `${displayName}を応援`}
        description={
          selectedPostTipContext
            ? "金額と通貨を選んで、そのまま応援を送れます。"
            : "金額と通貨を選んで、やさしく応援を送れます。"
        }
        onClose={closeSupportSheet}
      >
        {supportSheetLoaded ? (
          <ProfileWalletClient
            username={username}
            creator={creator}
            projectId={activeProjectId}
            projectIdsByCurrency={resolvedProjectIdsByCurrency}
            supportedJpycChainIds={supportedJpycChainIds}
            supportedChainIdsByCurrency={supportedChainIdsByCurrency}
            showLegacyCard={showLegacyCard}
            headerColor={creator.themeColor || "#2563eb"}
            selectedPostId={selectedPostTipContext?.id ?? null}
            selectedPostSummary={selectedPostTipContext?.preview ?? null}
            selectedPostCurrency={selectedPostTipContext?.preferredCurrency ?? null}
            onClearSelectedPost={() => setSelectedPostTipContext(null)}
            onPostContribution={postContribution}
            onAfterSend={afterSendPipeline}
          />
        ) : null}
      </SupportSheet>
    </>
  );

  if (layout === "content") {
    return content;
  }

  return <div className="space-y-4">{content}</div>;
}
