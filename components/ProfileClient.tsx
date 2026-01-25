/* components/ProfileClient.tsx */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useChainId } from "wagmi";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import type { CreatorProfile } from "@/lib/profileTypes";
import { postReverify, autoReverifyPending } from "@/lib/reverifyClient";

import {
  getChainConfig,
  getDefaultChainId,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";

import {
  clampPct,
  formatJpyc,
  getErrorMessage,
  type Currency,
} from "@/components/profile/profileClientHelpers";

import { ProjectProgressCard } from "@/components/profile/ProjectProgressCard";

const ProfileWalletClient = dynamic(
  () =>
    import("@/components/profile/ProfileWalletClient").then(
      (module) => module.ProfileWalletClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        ウォレット情報を読み込み中…
      </div>
    ),
  }
);

import {
  isRecord,
  pickPublicSummaryLite,
  type PublicSummaryLite,
} from "@/lib/publicSummary";
import { MyPageFooter } from "@/components/MyPageFooter";

// ===== Public API response（/api/public/creator）=====
type PublicCreatorResponse =
  | {
      ok: true;
      creator: {
        username: string;
        displayName: string;
        profileText: string | null;
        avatarUrl: string | null;
        themeColor: string | null;
        qrcodeUrl: string | null;
        externalUrl: string | null;
      };
      activeProjectId: string | null;
      summary: unknown | null;
    }
  | { ok: false; error: string; detail?: string };

const API_BASE = "";

/**
 * CreatorProfile の address が「null」を返してくる（Prisma/DB）ケースを吸収する入力型。
 * 内部では CreatorProfile に正規化して扱う。
 */
type CreatorProfileInput = Omit<CreatorProfile, "address"> & {
  address?: string | null;
};

type Props = {
  username: string;
  creator: CreatorProfileInput;
  projectId: string | null;
  publicSummary?: PublicSummaryLite | null;
  layout?: "full" | "content";
};

// ===== Project Progress（/api/projects/[projectId]/progress）型 =====
type ProgressTotalsAllChains = {
  JPYC: string | null;
  USDC: string | null;
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
    targetAmountJpyc: number;
    achievedAt: string | null;
    deadline?: string | null;
  } | null;
  progress: {
    confirmedJpyc: number;
    targetJpyc: number | null;
    progressPct: number;

    supportedJpycChainIds: number[];
    byChain: ProgressByChainRow[];
    totalsAllChains: ProgressTotalsAllChains;

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

/* ========== Phase1: Project status/get 型（/api/projects/[id]） ========== */

type ProjectStatusGet = {
  ok: true;
  status: string;
  project: { id: string; status: string; title?: string | null };
  goal: {
    id: string;
    targetAmountJpyc: number | null;
    achievedAt: string | null;
  } | null;
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

/* ========== メインコンポーネント ========== */

export default function ProfileClient({
  username,
  creator: creatorInput,
  projectId,
  publicSummary,
  layout = "full",
}: Props) {
  // --- creator の address null を排除して CreatorProfile に正規化 ---
  const creator: CreatorProfile = useMemo(() => {
    const normalizedAddress =
      typeof creatorInput.address === "string" &&
      creatorInput.address.length > 0
        ? creatorInput.address
        : undefined;

    return {
      ...(creatorInput as Omit<CreatorProfile, "address">),
      address: normalizedAddress,
    };
  }, [creatorInput]);

  const reverifyOnViewBusyRef = useRef(false);
  const publicSummaryFetchRef = useRef<string | null>(null);

  const [publicSummaryState, setPublicSummaryState] =
    useState<PublicSummaryLite | null>(publicSummary ?? null);

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
        const res = await fetch(
          `${API_BASE}/api/public/creator?username=${encodeURIComponent(
            username
          )}`,
          { cache: "no-store" }
        );
        const data: unknown = await res.json().catch(() => null);

        if (!cancelled && res.ok && isRecord(data) && data.ok === true) {
          const response = data as Extract<PublicCreatorResponse, { ok: true }>;
          setPublicSummaryState(
            response.summary ? pickPublicSummaryLite(response.summary) : null
          );
        }
      } catch {
        if (!cancelled) setPublicSummaryState(null);
      }
    }

    void fetchPublicSummary();

    return () => {
      cancelled = true;
    };
  }, [publicSummary, username]);

  // ===== Phase1 Progress/Goal states =====

  const hasProject = !!projectId;

  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [progressTotalYen, setProgressTotalYen] = useState<number | null>(null);
  const [progressConfirmedCount, setProgressConfirmedCount] = useState<
    number | null
  >(null);
  const [progressTargetYen, setProgressTargetYen] = useState<number | null>(
    null
  );
  const [progressReached, setProgressReached] = useState<boolean | null>(null);
  const [goalAchievedAt, setGoalAchievedAt] = useState<string | null>(null);

  // 追加：合算対象チェーン / チェーン別内訳
  const [supportedJpycChainIds, setSupportedJpycChainIds] = useState<number[]>(
    []
  );
  const [byChainJpyc, setByChainJpyc] = useState<ProgressByChainRow[]>([]);
  const [totalsAllChains, setTotalsAllChains] =
    useState<ProgressTotalsAllChains | null>(null);

  // “自動達成” 実行中フラグ（連打防止）
  const [achieving, setAchieving] = useState(false);

  const [projectGoalTargetYen, setProjectGoalTargetYen] = useState<
    number | null
  >(null);

  /* ========== Phase1: status/progress loader ========== */

  async function fetchProjectStatusSafe() {
    if (!projectId) return;

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      if (!res.ok) {
        setProjectStatus(null);
        setProjectTitle(null);
        return;
      }
      const json = (await res.json()) as ProjectStatusGet;
      if (json?.ok) {
        setProjectStatus(json.status ?? json.project?.status ?? null);

        const t = json.project?.title ?? null;
        setProjectTitle(typeof t === "string" && t.length > 0 ? t : null);

        const achievedAt =
          (json.goal?.achievedAt as string | null | undefined) ?? null;
        if (achievedAt) setGoalAchievedAt(achievedAt);

        const tt = json.goal?.targetAmountJpyc ?? null;
        if (typeof tt === "number" && Number.isFinite(tt)) {
          setProjectGoalTargetYen(tt);
        }
      }
    } catch {
      setProjectStatus(null);
      setProjectTitle(null);
    }
  }

  function toTxHashOrNull(v: unknown): `0x${string}` | null {
    if (typeof v !== "string") return null;
    if (!/^0x[0-9a-fA-F]{64}$/.test(v)) return null;
    return v as `0x${string}`;
  }

  async function fetchPendingTxHashesSafe(): Promise<`0x${string}`[]> {
    if (!projectId) return [];
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(
          projectId
        )}/contributions?status=PENDING`,
        { method: "GET", cache: "no-store" }
      );
      if (!res.ok) return [];
      const json: unknown = await res.json().catch(() => null);
      if (!isRecord(json) || json.ok !== true) return [];
      const arr = (json as Record<string, unknown>).items;
      if (!Array.isArray(arr)) return [];

      const out: `0x${string}`[] = [];
      for (const row of arr) {
        if (!isRecord(row)) continue;
        const h = toTxHashOrNull(row.txHash);
        if (h) out.push(h);
      }
      return out;
    } catch {
      return [];
    }
  }

  async function autoReverifyPendingOnView(): Promise<void> {
    if (!projectId) return;

    if (reverifyOnViewBusyRef.current) return;
    reverifyOnViewBusyRef.current = true;

    try {
      const r = await autoReverifyPending({
        projectId,
        cooldownMs: 60_000,
        maxPerView: 3,
      });

      if (r.verified.length > 0) {
        await fetchProjectProgressSafe();
        await fetchProjectStatusSafe();
      }
    } finally {
      reverifyOnViewBusyRef.current = false;
    }
  }

  async function fetchProjectProgressSafe(): Promise<ProjectProgressApi | null> {
    if (!projectId) return null;

    setProgressLoading(true);
    setProgressError(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/progress`,
        { method: "GET", cache: "no-store" }
      );

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setProgressError(`progress fetch failed: ${res.status} ${t}`);
        return null;
      }

      const json = (await res.json()) as unknown;

      if (
        !isRecord(json) ||
        json.ok !== true ||
        !isRecord(json.project) ||
        !isRecord(json.progress)
      ) {
        setProgressError("progress response shape mismatch");
        return null;
      }

      const typed = json as ProjectProgressApi;

      setProjectStatus(
        typeof typed.project.status === "string" ? typed.project.status : null
      );

      setProjectTitle(
        typeof typed.project.title === "string" &&
          typed.project.title.length > 0
          ? typed.project.title
          : null
      );

      // ---- supported chains / byChain / totalsAllChains ----
      const ids = Array.isArray(typed.progress.supportedJpycChainIds)
        ? typed.progress.supportedJpycChainIds.filter(
            (x): x is number => typeof x === "number" && Number.isFinite(x)
          )
        : [];

      setSupportedJpycChainIds(ids);

      const bc = Array.isArray(typed.progress.byChain)
        ? typed.progress.byChain
            .filter(
              (r): r is ProgressByChainRow =>
                isRecord(r) &&
                typeof r.chainId === "number" &&
                Number.isFinite(r.chainId) &&
                typeof r.confirmedAmountJpyc === "number" &&
                Number.isFinite(r.confirmedAmountJpyc) &&
                (typeof r.confirmedAmountDecimal === "string" ||
                  r.confirmedAmountDecimal === null)
            )
            .map((r) => ({
              chainId: r.chainId,
              confirmedAmountDecimal: r.confirmedAmountDecimal,
              confirmedAmountJpyc: r.confirmedAmountJpyc,
            }))
        : [];

      setByChainJpyc(bc);

      const tac = typed.progress.totalsAllChains as unknown;
      if (
        isRecord(tac) &&
        "JPYC" in tac &&
        "USDC" in tac &&
        (typeof tac.JPYC === "string" || tac.JPYC === null) &&
        (typeof tac.USDC === "string" || tac.USDC === null)
      ) {
        setTotalsAllChains({ JPYC: tac.JPYC, USDC: tac.USDC });
      } else {
        setTotalsAllChains(null);
      }

      // ---- 既存：progress / goal ----
      const confirmed = Number(typed.progress.confirmedJpyc ?? 0);
      setProgressTotalYen(Number.isFinite(confirmed) ? confirmed : 0);

      const target = typed.progress.targetJpyc ?? null;
      setProgressTargetYen(
        typeof target === "number" && Number.isFinite(target) ? target : null
      );

      const reached =
        typeof target === "number" && Number.isFinite(target) && target > 0
          ? confirmed >= target
          : null;
      setProgressReached(reached);

      const achievedAt = typed.goal?.achievedAt ?? null;
      setGoalAchievedAt(
        typeof achievedAt === "string" && achievedAt.length > 0
          ? achievedAt
          : null
      );

      setProgressConfirmedCount(null);

      if (typed.goal?.targetAmountJpyc != null) {
        setProjectGoalTargetYen(typed.goal.targetAmountJpyc);
      }

      return typed;
    } catch (e) {
      setProgressError(getErrorMessage(e));
      return null;
    } finally {
      setProgressLoading(false);
    }
  }

  async function achieveGoalSafe(): Promise<GoalAchievePost | null> {
    if (!projectId) return null;

    setAchieving(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/goal/achieve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.warn("POST /goal/achieve failed:", res.status, t);
        return null;
      }

      const json = (await res.json()) as GoalAchievePost;
      await fetchProjectStatusSafe();
      await fetchProjectProgressSafe();
      return json;
    } catch (e) {
      console.warn("POST /goal/achieve error:", e);
      return null;
    } finally {
      setAchieving(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;

    void fetchProjectStatusSafe();
    void fetchProjectProgressSafe();
    void autoReverifyPendingOnView();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const MAX_PER_LOAD = 5;
  const COOLDOWN_MS = 20_000;
  const KEY_PREFIX = "cf:reverify:lastAttempt:";

  function getLastAttempt(txHash: string): number {
    try {
      const v = localStorage.getItem(KEY_PREFIX + txHash);
      if (!v) return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  function setLastAttempt(txHash: string, ms: number): void {
    try {
      localStorage.setItem(KEY_PREFIX + txHash, String(ms));
    } catch {
      // ignore
    }
  }

  const attemptedThisViewRef = useMemo(
    () => ({ set: new Set<string>() }),
    [projectId]
  );
  const [autoReverifyRunning, setAutoReverifyRunning] = useState(false);
  const [loadWalletSection, setLoadWalletSection] = useState(false);
  const walletSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function run(): Promise<void> {
      if (autoReverifyRunning) return;
      if (progressTotalYen == null && progressLoading) return;

      setAutoReverifyRunning(true);
      try {
        const pending = await fetchPendingTxHashesSafe();
        if (cancelled) return;
        if (pending.length === 0) return;

        const t0 = Date.now();

        const candidates: `0x${string}`[] = [];
        for (const h of pending) {
          if (attemptedThisViewRef.set.has(h)) continue;

          const last = getLastAttempt(h);
          if (t0 - last < COOLDOWN_MS) continue;

          candidates.push(h);
          if (candidates.length >= MAX_PER_LOAD) break;
        }

        if (candidates.length === 0) return;

        for (const h of candidates) {
          attemptedThisViewRef.set.add(h);
          setLastAttempt(h, t0);
        }

        let anyConfirmed = false;

        for (const h of candidates) {
          if (cancelled) return;
          const r = await postReverify(h);
          if (r.verified === true) anyConfirmed = true;
        }

        if (anyConfirmed && !cancelled) {
          await fetchProjectProgressSafe();
          await fetchProjectStatusSafe();
        }
      } finally {
        if (!cancelled) setAutoReverifyRunning(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, progressTotalYen]);

  useEffect(() => {
    if (loadWalletSection) return;
    if (typeof window === "undefined") return;

    let observer: IntersectionObserver | null = null;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const trigger = () => {
      if (observer && walletSectionRef.current) {
        observer.unobserve(walletSectionRef.current);
      }
      if (idleId != null) {
        const win = window as Window & {
          cancelIdleCallback?: (id: number) => void;
        };
        win.cancelIdleCallback?.(idleId);
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      setLoadWalletSection(true);
    };

    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        trigger();
      }
    });

    if (walletSectionRef.current) {
      observer.observe(walletSectionRef.current);
    }

    const win = window as Window & {
      requestIdleCallback?: (
        callback: (deadline: { didTimeout: boolean }) => void,
        options?: { timeout: number }
      ) => number;
    };

    if (win.requestIdleCallback) {
      idleId = win.requestIdleCallback(() => trigger(), { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(() => trigger(), 2000);
    }

    return () => {
      observer?.disconnect();
      if (idleId != null) {
        const cancelWin = window as Window & {
          cancelIdleCallback?: (id: number) => void;
        };
        cancelWin.cancelIdleCallback?.(idleId);
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [loadWalletSection]);

  async function postContribution(args: {
    projectId?: string;
    purposeId?: string;
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
      const res = await fetch("/api/contributions", {
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
          chainId: args.chainId,
          currency: args.currency,
          txHash: args.txHash,
          fromAddress: args.fromAddress,
          toAddress: args.toAddress,
          amount: String(args.amount),
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.warn("POST /api/contributions failed:", res.status, t);
        return { ok: false, reason: `HTTP_${res.status}` };
      }

      return { ok: true };
    } catch (e) {
      console.warn("POST /api/contributions error:", e);
      return { ok: false, reason: "FETCH_FAILED" };
    }
  }

  /**
   * 送金後に：
   * 1) contributions 登録
   * 2) reverify で receipt 検証（PENDING→CONFIRMED）
   * 3) progress を更新
   * 4) reached なら goal/achieve（未達成時のみ）
   */
  async function afterSendPipeline(txHash: string) {
    if (!projectId) return;

    const maxTry = 3;
    for (let i = 0; i < maxTry; i++) {
      const r = await postReverify(txHash as `0x${string}`);
      if (r.verified === true) break;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    const p = await fetchProjectProgressSafe();

    const achievedAt =
      (p?.goal?.achievedAt && p.goal.achievedAt.length > 0
        ? p.goal.achievedAt
        : null) ?? goalAchievedAt;

    const target =
      typeof p?.progress?.targetJpyc === "number" &&
      Number.isFinite(p.progress.targetJpyc)
        ? p.progress.targetJpyc
        : null;

    const confirmed =
      typeof p?.progress?.confirmedJpyc === "number" &&
      Number.isFinite(p.progress.confirmedJpyc)
        ? p.progress.confirmedJpyc
        : 0;

    const reached = target != null && target > 0 ? confirmed >= target : null;

    if (reached === true && !achievedAt) {
      await achieveGoalSafe();
    } else {
      await fetchProjectStatusSafe();
    }
  }

  function extractYouTubeId(url: string): string {
    const regExp = /(?:v=|youtu\.be\/)([^&]+)/;
    const match = url.match(regExp);
    return match ? match[1] : "";
  }

  const defaultColor = "#005bbb";
  const headerColor = creator.themeColor || defaultColor;
  const connectedChainId = useChainId();
  const explorerChainId = useMemo(() => {
    if (
      isSupportedChainId(connectedChainId) &&
      (supportedJpycChainIds.length === 0 ||
        supportedJpycChainIds.includes(connectedChainId))
    ) {
      return connectedChainId;
    }

    const first = supportedJpycChainIds.find((id) => isSupportedChainId(id));
    return first != null ? (first as SupportedChainId) : getDefaultChainId();
  }, [connectedChainId, supportedJpycChainIds]);
  const explorerChainConfig = getChainConfig(explorerChainId);
  const profileAddressUrl =
    creator.address && explorerChainConfig?.explorerBaseUrl
      ? `${explorerChainConfig.explorerBaseUrl}/address/${creator.address}`
      : explorerChainConfig?.explorerBaseUrl ?? "";

  const resolvedTargetYen =
    progressTargetYen != null ? progressTargetYen : projectGoalTargetYen;

  const showManualAchieveButton = useMemo(() => {
    if (!hasProject) return false;
    if (progressReached !== true) return false;
    if (goalAchievedAt) return false;
    return true;
  }, [hasProject, progressReached, goalAchievedAt]);

  // =========================================================
  // 表示優先順位（要求通り）
  // 1) DBカード（主表示）: hasProject && goal設定あり
  // 2) Public Summary（代替）: 1が無い/goal未設定 && publicSummaryが成立
  // 3) Legacy on-chain（互換）: 最後（or feature flag）
  // =========================================================
  const hasDbGoal =
    hasProject &&
    typeof resolvedTargetYen === "number" &&
    Number.isFinite(resolvedTargetYen) &&
    resolvedTargetYen > 0;

  const hasPublicGoal =
    !!publicSummaryState?.goal && !!publicSummaryState?.progress;
  const hasLegacyOnchainGoal = !!creator.goalTitle && !!creator.goalTargetJpyc;

  const showDbCard = hasDbGoal;
  const showPublicCard = !showDbCard && hasPublicGoal;

  const ENABLE_LEGACY_ONCHAIN_GOAL = true;
  const showLegacyCard =
    ENABLE_LEGACY_ONCHAIN_GOAL && !showDbCard && !showPublicCard
      ? hasLegacyOnchainGoal
      : false;

  const content = (
    <>
      {/* ========== 1) Phase1: Project Progress（DB集計） 主表示 ========== */}
      {showDbCard && (
        <ProjectProgressCard
          headerColor={headerColor}
          projectTitle={projectTitle}
          projectStatus={projectStatus}
          profileAddressUrl={profileAddressUrl}
          progressLoading={progressLoading}
          progressError={progressError}
          progressTotalYen={progressTotalYen}
          resolvedTargetYen={resolvedTargetYen}
          // progressPercent={progressPercent}
          progressConfirmedCount={progressConfirmedCount}
          goalAchievedAt={goalAchievedAt}
          progressReached={progressReached}
          supportedJpycChainIds={supportedJpycChainIds}
          byChainJpyc={byChainJpyc}
          // totalsAllChains={totalsAllChains}
          achieving={achieving}
          showManualAchieveButton={showManualAchieveButton}
          onRefresh={() => {
            void fetchProjectStatusSafe();
            void fetchProjectProgressSafe();
          }}
          onAchieve={() => {
            void achieveGoalSafe();
          }}
        />
      )}

      {/* ========== 2) Public Summary Goal（/api/public/creator の要約） 代替表示 ========== */}
      {showPublicCard ? (
        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-900">
                Goal
              </div>
              {publicSummaryState?.goal?.achievedAt ? (
                <span className="text-[11px] text-emerald-700">達成済み</span>
              ) : null}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-600">
              目標:{" "}
              {publicSummaryState?.goal
                ? formatJpyc(publicSummaryState.goal.targetAmountJpyc)
                : "-"}{" "}
              JPYC
              {publicSummaryState?.goal?.deadline ? (
                <span className="ml-2">
                  期限: {publicSummaryState.goal.deadline.slice(0, 10)}
                </span>
              ) : null}
            </div>

            <div className="text-sm text-gray-800 dark:text-gray-900">
              現在:{" "}
              {publicSummary?.progress
                ? formatJpyc(publicSummary.progress.confirmedJpyc)
                : "-"}{" "}
              JPYC
            </div>

            <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
              <div
                className="h-2"
                style={{
                  backgroundColor: headerColor,
                  width: `${clampPct(
                    publicSummaryState?.progress?.progressPct ?? 0
                  )}%`,
                }}
              />
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-600">
              {Math.floor(
                clampPct(publicSummaryState?.progress?.progressPct ?? 0)
              )}
              % 達成
            </div>
          </div>
        </div>
      ) : null}

      {/* YouTube 動画ブロック */}
      {creator.youtubeVideos && creator.youtubeVideos.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-50 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-300">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-900 mb-2">
            🎬 紹介動画 / Featured Videos
          </h3>

          {creator.youtubeVideos.map((v, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={`https://img.youtube.com/vi/${extractYouTubeId(
                    v.url
                  )}/hqdefault.jpg`}
                  alt={v.title}
                  className="rounded-xl w-full mb-2 shadow-sm hover:opacity-90 transition"
                />
              </a>

              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-900 mb-2 mt-4">
                {v.title}
              </h4>

              <p className="text-sm text-gray-600 dark:text-gray-700 leading-relaxed mb-3">
                {v.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <div ref={walletSectionRef}>
        {loadWalletSection ? (
          <ProfileWalletClient
            username={username}
            creator={creator}
            projectId={projectId}
            supportedJpycChainIds={supportedJpycChainIds}
            showLegacyCard={showLegacyCard}
            headerColor={headerColor}
            onPostContribution={postContribution}
            onAfterSend={afterSendPipeline}
          />
        ) : (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            ウォレット情報を準備しています…
          </div>
        )}
      </div>

      {/* フッター */}
      <footer
        className="mt-8 -mx-4 sm:-mx-6 px-6 py-5 text-center text-[11px] leading-relaxed text-white/90 space-y-3"
        style={{
          backgroundColor: defaultColor,
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.16), transparent 45%)",
        }}
      >
        <div className="flex justify-center mb-2">
          <img
            src="/icon/creator_founding_white.svg"
            alt="creator founding logo"
            className="w-[170px] h-auto opacity-90"
          />
        </div>
        <p>
          ・本サービスは、クリエイター応援を目的とした個人学習による無償提供のUIツールです。
        </p>
        <p>
          ・本サービス（コンテンツ・作品等）はJPYC株式会社の公式コンテンツではありません。
        </p>
        <p>
          ・JPYC/USDCの送付は利用者が外部ウォレットで行うもので、本サービスは資金の保管・預託・管理・送付やその代理・媒介には一切関与しません。
        </p>
        <p>
          ・本サイトの投げ銭は<strong>無償の応援</strong>
          です。返金や金銭的・物品的な対価は一切発生しません。
        </p>
      </footer>
    </>
  );

  if (layout === "content") {
    return content;
  }

  /* ========== 表示部分 ========== */
  return (
    <div className="container-narrow py-8 force-light-theme">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {/* プロフィールヘッダー */}
        <ProfileHeader
          username={username}
          creator={creator}
          headerColor={headerColor}
        />

        <div className="px-4">{content}</div>
      </div>
      <MyPageFooter />
    </div>
  );
}
