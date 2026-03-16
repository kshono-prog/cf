"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import { autoReverifyPending, postReverify } from "@/lib/reverifyClient";
import {
  clampPct,
  getErrorMessage,
  type Currency,
} from "@/components/profile/profileClientHelpers";
import {
  isRecord,
  type PublicSummaryLite,
} from "@/lib/publicSummary";
import type { SelectedPostTipContext } from "@/components/feed/feedTypes";
import { LazyFeedSection } from "@/components/feed/LazyFeedSection";
import { Avatar } from "@/components/shared/Avatar";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";
import { ProfileHero } from "@/components/profile/ProfileHero";
import {
  buildSupportProjectView,
  type SupportProjectView,
  type SupportProfileView,
} from "@/lib/supportProfileView";
import { SupportProjectSummaryCard } from "@/components/support/SupportProjectSummaryCard";

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

const SupportSheet = dynamic(
  () =>
    import("@/components/support/SupportSheet").then(
      (module) => module.SupportSheet
    ),
  {
    ssr: false,
  }
);

const CreatorCommunityCard = dynamic(
  () =>
    import("@/components/profile/CreatorCommunityCard").then(
      (module) => module.CreatorCommunityCard
    ),
  {
    loading: () => (
      <div className="text-sm text-[var(--text-subtle)]">
        つながり情報を準備しています…
      </div>
    ),
  }
);

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
  supportProfileView?: SupportProfileView | null;
  recruitingProjects?: SupportProjectView[];
  initialFeed?: FeedListView | null;
  layout?: "full" | "content";
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
  supportProfileView,
  recruitingProjects = [],
  initialFeed = null,
  layout = "full",
}: Props) {
  const { address: viewerAddress } = useAccount();
  const searchParams = useSearchParams();
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
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const reverifyOnViewBusyRef = useRef(false);
  const attemptedThisViewRef = useRef<{ set: Set<string> }>({
    set: new Set<string>(),
  });
  const handledSupportLinkRef = useRef<string | null>(null);

  const [supportProfileState, setSupportProfileState] =
    useState<SupportProfileView>(
      supportProfileView ?? {
        mode:
          creator.goalTitle || creator.profile ? "draft" : "unavailable",
        activeCurrency: null,
        activeProjectId: null,
        projectsByCurrency: {
          JPYC: null,
          USDC: null,
        },
        draft:
          creator.goalTitle || creator.profile
            ? {
                title: creator.goalTitle ?? null,
                description: creator.profile ?? null,
              }
            : null,
      }
    );
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);
  const [selectedSupportProjectId, setSelectedSupportProjectId] =
    useState<string | null>(null);
  const [selectedPostTipContext, setSelectedPostTipContext] =
    useState<SelectedPostTipContext | null>(null);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const [supportSheetLoaded, setSupportSheetLoaded] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [goalAchievedAt, setGoalAchievedAt] = useState<string | null>(null);
  const [supportedJpycChainIds, setSupportedJpycChainIds] = useState<number[]>(
    []
  );
  const [supportedChainIdsByCurrency, setSupportedChainIdsByCurrency] =
    useState<ProgressSupportedChainIdsByCurrency>({
      JPYC: [],
      USDC: [],
    });
  const [autoReverifyRunning, setAutoReverifyRunning] = useState(false);

  useEffect(() => {
    if (!supportProfileView) return;
    setSupportProfileState(supportProfileView);
  }, [supportProfileView]);

  const recruitingProjectMap = useMemo(
    () =>
      new Map(
        recruitingProjects.map((project) => [project.projectId, project] as const)
      ),
    [recruitingProjects]
  );

  const selectedSupportProject = useMemo(
    () =>
      selectedSupportProjectId
        ? recruitingProjectMap.get(selectedSupportProjectId) ?? null
        : null,
    [recruitingProjectMap, selectedSupportProjectId]
  );

  useEffect(() => {
    const requestedProjectId = searchParams.get("projectId");
    if (!requestedProjectId) return;

    const nextProject = recruitingProjectMap.get(requestedProjectId);
    if (!nextProject) return;

    setSelectedSupportProjectId(nextProject.projectId);
    if (viewCurrency !== nextProject.currency) {
      setViewCurrency(nextProject.currency);
    }

    const supportFlag = searchParams.get("support");
    const supportKey = `${requestedProjectId}:${supportFlag ?? ""}`;
    if (supportFlag === "1" && handledSupportLinkRef.current !== supportKey) {
      handledSupportLinkRef.current = supportKey;
      setSupportSheetLoaded(true);
      setSupportSheetOpen(true);
    }
  }, [recruitingProjectMap, searchParams, viewCurrency]);

  const availableSupportCurrencies = useMemo(
    () =>
      (["JPYC", "USDC"] as const).filter(
        (currency) => supportProfileState.projectsByCurrency[currency] !== null
      ),
    [supportProfileState]
  );

  const activeSupportProject = useMemo(() => {
    if (selectedSupportProject) {
      return selectedSupportProject;
    }

    const preferred = supportProfileState.projectsByCurrency[viewCurrency];
    if (preferred) return preferred;
    if (supportProfileState.activeCurrency) {
      return supportProfileState.projectsByCurrency[supportProfileState.activeCurrency];
    }
    return availableSupportCurrencies.length > 0
      ? supportProfileState.projectsByCurrency[availableSupportCurrencies[0]]
      : null;
  }, [
    availableSupportCurrencies,
    selectedSupportProject,
    supportProfileState,
    viewCurrency,
  ]);

  const activeProjectId = activeSupportProject?.projectId ?? null;

  useEffect(() => {
    if (selectedSupportProject) return;
    if (supportProfileState.mode !== "ready") return;
    if (supportProfileState.projectsByCurrency[viewCurrency]) return;
    if (supportProfileState.activeCurrency) {
      setViewCurrency(supportProfileState.activeCurrency);
      return;
    }
    if (availableSupportCurrencies[0]) {
      setViewCurrency(availableSupportCurrencies[0]);
    }
  }, [
    availableSupportCurrencies,
    selectedSupportProject,
    supportProfileState,
    viewCurrency,
  ]);

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
        const identity = await fetchPublicViewerIdentityCached(connectedAddress);
        if (!cancelled) {
          setViewerIdentity(identity);
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

  const viewerState = resolvePublicViewerState({
    pageUsername: username,
    pageCreatorAddress: creator.address ?? null,
    viewerAddress: viewerAddress ?? null,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });
  const shouldPrefetchProjectProgress = Boolean(activeProjectId);

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

      setSupportProfileState((current) => {
        const currency = typed.progress.currency === "USDC" ? "USDC" : "JPYC";
        const nextProject = buildSupportProjectView({
          projectId: typed.project.id,
          currency,
          title:
            typeof typed.project.title === "string" && typed.project.title.length > 0
              ? typed.project.title
              : `${creator.displayName || username}の活動を応援する`,
          description: creator.profile ?? null,
          targetAmount:
            typeof target === "number" && Number.isFinite(target) ? target : null,
          confirmedAmount: Number.isFinite(confirmed) ? confirmed : 0,
          progressPct:
            typeof typed.progress.progressPct === "number" &&
            Number.isFinite(typed.progress.progressPct)
              ? typed.progress.progressPct
              : 0,
          achievedAt: typed.goal?.achievedAt ?? null,
          deadline: typed.goal?.deadline ?? null,
        });

        return {
          mode: "ready",
          activeCurrency: current.activeCurrency ?? currency,
          activeProjectId: typed.project.id,
          projectsByCurrency: {
            ...current.projectsByCurrency,
            [currency]: nextProject,
          },
          draft: null,
        };
      });
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

      return typed;
    } catch (error) {
      setProgressError(getErrorMessage(error));
      return null;
    } finally {
      setProgressLoading(false);
    }
  }, [activeProjectId, creator.displayName, creator.profile, username]);

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
    if (!activeProjectId || !shouldPrefetchProjectProgress) return;

    attemptedThisViewRef.current.set.clear();
    void fetchProjectProgressSafe();
    if (viewerState.isOwner) {
      void autoReverifyPendingOnView();
    }
  }, [
    activeProjectId,
    autoReverifyPendingOnView,
    fetchProjectProgressSafe,
    shouldPrefetchProjectProgress,
    viewerState.isOwner,
  ]);

  useEffect(() => {
    if (!activeProjectId || !viewerState.isOwner) return;
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
    activeSupportProject?.confirmedAmount,
    autoReverifyRunning,
    fetchPendingTxHashesSafe,
    fetchProjectProgressSafe,
    progressLoading,
    viewerState.isOwner,
  ]);

  async function postContribution(args: {
    contributionId?: string;
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
          ...(args.contributionId
            ? { contributionId: String(args.contributionId) }
            : {}),
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

  const displayName = creator.displayName || username;
  const showLegacyCard = false;
  const supportMode = supportProfileState.mode;
  const supportCardReady = activeSupportProject !== null;
  const supportTitle =
    supportCardReady
      ? activeSupportProject?.title ?? `${displayName}の活動を応援する`
      : supportMode === "draft"
      ? supportProfileState.draft?.title ?? `${displayName}の公開ページは準備中です`
      : `${displayName}の公開ページは準備中です`;
  const supportDescription =
    supportCardReady
      ? activeSupportProject?.description ?? null
      : supportMode === "draft"
      ? supportProfileState.draft?.description ?? null
      : "公開ページを準備中です。応援内容が整うと、ここから確認できます。";
  const canOpenSupportSheet =
    supportCardReady || recruitingProjects.length > 0;

  const ownerProjectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    for (const currency of ["JPYC", "USDC"] as const) {
      const nextProject = supportProfileState.projectsByCurrency[currency];
      const nextId = nextProject?.projectId ?? resolvedProjectIdsByCurrency[currency];
      if (!nextId || seen.has(nextId)) continue;
      seen.add(nextId);

      options.push({
        id: nextId,
        label: `${currency} / ${nextProject?.title ?? `${currency} の公開ページ`}`,
      });
    }

    return options;
  }, [resolvedProjectIdsByCurrency, supportProfileState.projectsByCurrency]);

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
    openSupportSheet();
  }

  function handleOpenProjectSupport(project: SupportProjectView) {
    setSelectedPostTipContext(null);
    setSelectedSupportProjectId(project.projectId);
    if (viewCurrency !== project.currency) {
      setViewCurrency(project.currency);
    }
    openSupportSheet();
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
  const availableCurrencies = availableSupportCurrencies;
  const selectedCurrencyLabel =
    activeSupportProject?.currency ??
    supportProfileState.activeCurrency ??
    "JPYC";
  const currentSupportLabel = activeSupportProject
    ? `${formatSupportAmount(
        activeSupportProject.confirmedAmount,
        activeSupportProject.currency
      )} ${activeSupportProject.currency}`
    : "-";
  const targetSupportLabel = activeSupportProject
    ? activeSupportProject.targetAmount != null
      ? `${formatSupportAmount(
          activeSupportProject.targetAmount,
          activeSupportProject.currency
        )} ${activeSupportProject.currency}`
      : "-"
    : "-";
  const statusLabel =
    activeSupportProject?.status === "ACHIEVED"
      ? "目標達成済み"
      : activeSupportProject?.status === "NO_GOAL"
      ? "目標未設定"
      : "受付中";
  const statusDetail = activeSupportProject?.deadline
    ? `期限 ${activeSupportProject.deadline.slice(0, 10)}`
    : activeSupportProject
    ? null
    : supportMode === "draft"
    ? "公開ページを準備中です"
    : "応援を受け付ける準備が整っていません";

  async function handleViewerConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  const profileGuideCard = (() => {
    if (viewerState.isOwner) {
      return (
        <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[var(--text)]">
                これはあなたの公開ページです
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
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
        <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[var(--text)]">
                {canOpenSupportSheet
                  ? "応援はできます。投稿したいときはユーザー登録"
                  : "公開ページを準備中です。投稿したいときはユーザー登録"}
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
                {canOpenSupportSheet
                  ? "まずは登録すると、自分のページと投稿機能を使い始められます。"
                  : "まずは登録すると、自分のページと投稿機能を使い始められます。応援内容は公開ページの準備が整うと表示されます。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canOpenSupportSheet ? (
                <button type="button" className="btn" onClick={openSupportSheet}>
                  応援する
                </button>
              ) : null}
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
        <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[var(--text)]">
                {canOpenSupportSheet
                  ? "自分の公開ページを作ると、投稿も始められます"
                  : "自分の公開ページを整えると、応援内容も表示できます"}
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
                {canOpenSupportSheet
                  ? `いまは ${pageDisplayName} さんのページを見ています。自分のページを整えると投稿も始められます。`
                  : `いまは ${pageDisplayName} さんのページを見ています。自分のページを整えると、応援内容も自然に見せられます。`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canOpenSupportSheet ? (
                <button type="button" className="btn" onClick={openSupportSheet}>
                  応援する
                </button>
              ) : null}
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                設定を開く
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[13px] font-medium text-[var(--text-subtle)]">
            いま見ているのは {pageDisplayName} さんの公開ページです
          </div>
          <Link href={viewerProfileHref} className="btn-secondary px-3 py-1.5 text-[12px]">
            自分のページを見る
          </Link>
        </div>
      </section>
    );
  })();

  const profileScreen = (
    <div className="space-y-3">
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
      {recruitingProjects.length === 0 ? (
        <section className="panel-card px-3.5 py-2.5 sm:px-4 sm:py-3">
          <div className="grid gap-2.5 pb-2.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
            <div className="flex min-w-0 flex-col items-center justify-center gap-2 text-center">
              <div className="flex min-w-0 flex-col items-center gap-2">
                <Avatar
                  src={creator.avatarUrl}
                  alt={`${displayName} のアイコン`}
                  fallbackText={displayName.slice(0, 1) || "?"}
                  size={32}
                />
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  {displayName}
                </div>
              </div>
              <div>
                {viewerState.isOwner ? (
                  <Link
                    href={viewerWorkspaceHref}
                    className="btn-secondary px-3 py-1.5 text-[12px]"
                  >
                    公開ページを整える
                  </Link>
                ) : canOpenSupportSheet ? (
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-[12px]"
                    onClick={openSupportSheet}
                  >
                    応援する
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">
                {supportTitle}
              </div>
              {supportDescription ? (
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-4.5 text-[var(--text-subtle)] sm:mt-1 sm:text-[12px]">
                  {supportDescription}
                </p>
              ) : null}
            </div>
          </div>

          {!supportCardReady ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-[11px] leading-5 text-[var(--text-subtle)]">
              {supportMode === "draft"
                ? "公開ページを準備中です。応援内容が整うと、ここに進捗が表示されます。"
                : "いまは応援内容を読み込めません。時間をおいてもう一度お試しください。"}
            </div>
          ) : progressLoading ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-sm text-[var(--text-subtle)]">
              読み込み中です
            </div>
          ) : progressError ? (
            <div className="alert-warn mt-1.5">
              うまく読み込めませんでした。もう一度お試しください。
            </div>
          ) : (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-1.5 sm:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">集まった応援</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[1rem]">
                  {currentSupportLabel}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">目標</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[1rem]">
                  {targetSupportLabel}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[10px] font-medium text-[var(--text-subtle)]">進捗</div>
                  <div className="text-[12px] font-semibold text-[var(--text)]">
                    {activeSupportProject
                      ? `${Math.floor(clampPct(activeSupportProject.progressPct))}%`
                      : "-"}
                  </div>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--support)]"
                    style={{
                      width: `${
                        activeSupportProject
                          ? clampPct(activeSupportProject.progressPct)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">状態</div>
                <div className="mt-0.5 text-[13px] font-semibold text-[var(--text)]">
                  {statusLabel}
                </div>
                {statusDetail ? (
                  <div className="mt-0.5 text-[10px] leading-4 text-[var(--text-subtle)]">
                    {statusDetail}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {supportCardReady && availableCurrencies.length > 1 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-1.5">
              <div className="text-[10px] font-medium text-[var(--text-subtle)]">
                表示通貨
              </div>
              {(["JPYC", "USDC"] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  className={`chip-button px-2.5 py-1 text-[11px] ${
                    viewCurrency === currency
                      ? "border-slate-900 bg-slate-900 text-white"
                      : ""
                  }`}
                  disabled={!supportProfileState.projectsByCurrency[currency]}
                  onClick={() => setViewCurrency(currency)}
                >
                  {currency}
                </button>
              ))}
            </div>
          ) : supportCardReady && availableCurrencies.length === 1 ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-[10px] text-[var(--text-subtle)]">
              表示通貨: {selectedCurrencyLabel}
            </div>
          ) : null}
        </section>
      ) : null}

      {recruitingProjects.length > 0 ? (
        <section className="panel-card px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-[var(--text)]">
                募集中のプロジェクト
              </div>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                いま応援を受け付けている project をまとめて見られます。
              </p>
            </div>
            <div className="text-sm text-[var(--text-subtle)]">
              {recruitingProjects.length} 件
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recruitingProjects.map((project) => {
              const isSelected = activeSupportProject?.projectId === project.projectId;

              return (
                <SupportProjectSummaryCard
                  key={project.projectId}
                  creator={{
                    username,
                    displayName,
                    avatarUrl: creator.avatarUrl ?? null,
                  }}
                  project={project}
                  isSelected={isSelected}
                  actionLabel={
                    isSelected ? "選択中の project" : "この project を応援"
                  }
                  onAction={() => {
                    handleOpenProjectSupport(project);
                  }}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {creator.youtubeVideos && creator.youtubeVideos.length > 0 ? (
        <section className="panel-card px-4 py-4 sm:px-5 sm:py-5">
          <div className="text-base font-semibold text-[var(--text)]">紹介動画</div>
          <div className="mt-3 space-y-4">
            {creator.youtubeVideos.map((video, index) => {
              const videoId = extractYouTubeId(video.url);

              return (
                <div key={`${video.url}-${index}`} className="space-y-2.5">
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
                    <div className="text-[15px] font-semibold text-[var(--text)]">
                      {video.title || "紹介動画"}
                    </div>
                    {video.description ? (
                      <p className="mt-1.5 text-[13px] leading-6 text-[var(--text-subtle)]">
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
        <LazyFeedSection
          creatorUsername={username}
          viewerAddress={viewerAddress ?? null}
          managedCreatorUsername={viewerState.creatorUsername}
          managePostAddress={viewerState.hasCreator ? viewerAddress ?? null : null}
          manageProjectOptions={ownerProjectOptions}
          selectedPostId={selectedPostTipContext?.id ?? null}
          projectIdsByCurrency={resolvedProjectIdsByCurrency}
          showTipAction={canOpenSupportSheet}
          refreshToken={feedRefreshToken}
          initialFeed={initialFeed}
          headerColor={creator.themeColor || "#2563eb"}
          onSelectTipPost={handleSelectPostTip}
          onFocusWalletSection={openSupportSheet}
        />
      </div>

      {viewerState.mode === "unconnected" ? profileGuideCard : null}
    </div>
  );

  const content = (
    <>
      {profileScreen}

      {canOpenSupportSheet && (supportSheetLoaded || supportSheetOpen) ? (
        <SupportSheet
          open={supportSheetOpen}
          title={
            selectedPostTipContext
              ? "この投稿を応援"
              : selectedSupportProject
              ? `${selectedSupportProject.title}を応援`
              : `${displayName}を応援`
          }
          description={
            selectedPostTipContext
              ? "金額と通貨を選んで、そのまま応援を送れます。"
              : selectedSupportProject
              ? "選んだ project に向けて、そのまま応援を送れます。"
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
              selectedProjectId={selectedSupportProject?.projectId ?? null}
              selectedProjectTitle={selectedSupportProject?.title ?? null}
              selectedProjectCurrency={selectedSupportProject?.currency ?? null}
              selectedPostId={selectedPostTipContext?.id ?? null}
              selectedPostSummary={selectedPostTipContext?.preview ?? null}
              selectedPostCurrency={selectedPostTipContext?.preferredCurrency ?? null}
              onClearSelectedPost={() => setSelectedPostTipContext(null)}
              onPostContribution={postContribution}
              onAfterSend={afterSendPipeline}
            />
          ) : null}
        </SupportSheet>
      ) : null}
    </>
  );

  if (layout === "content") {
    return content;
  }

  return <div className="space-y-4">{content}</div>;
}
