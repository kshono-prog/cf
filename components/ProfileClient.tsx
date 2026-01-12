/* components/ProfileClient.tsx */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";

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
  const explorerChainId = useMemo(() => {
    const first = supportedJpycChainIds.find((id) => isSupportedChainId(id));
    return first != null ? (first as SupportedChainId) : getDefaultChainId();
  }, [supportedJpycChainIds]);
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

        <div className="px-4">
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
                    <span className="text-[11px] text-emerald-700">
                      達成済み
                    </span>
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
              ・JPYC/USDCの送付は外部ウォレットで実行され、本サービスは送付処理に関与しません。
            </p>
            <p>
              ・本サイトの投げ銭は<strong>無償の応援</strong>
              です。返金や金銭的・物品的な対価は一切発生しません。
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

// /* components/ProfileClient.tsx */
// "use client";

// import { useEffect, useMemo, useState, useRef } from "react";
// import { ethers } from "ethers";

// import {
//   useAccount,
//   useConnect,
//   useDisconnect,
//   useChainId,
//   useWalletClient,
//   usePublicClient,
// } from "wagmi";
// import { useEthersProvider } from "@/lib/useEthersSigner";
// import { formatUnits, type Address } from "viem";
// import { useSearchParams } from "next/navigation";
// import { appkit } from "@/lib/appkitInstance";

// import {
//   getChainConfig,
//   getDefaultChainId,
//   isSupportedChainId,
//   type SupportedChainId,
// } from "../lib/chainConfig";
// import { readBalances, type WalletBalances } from "../lib/walletService";
// import { getTokenOnChain, type TokenKey } from "../lib/tokenRegistry";
// import { ProfileHeader } from "@/components/profile/ProfileHeader";
// import type { CreatorProfile } from "@/lib/profileTypes";
// import { PromoCreatorFounding } from "@/components/promo/PromoCreatorFounding";
// import { PromoGasSupport } from "@/components/promo/PromoGasSupport";
// import { PromoJpycEx } from "@/components/promo/PromoJpycEx";
// import { postReverify, autoReverifyPending } from "@/lib/reverifyClient";

// import {
//   addAmount,
//   clampPct,
//   clearLastTx,
//   ERC20_ABI,
//   formatJpyc,
//   getEthereum,
//   getErrorMessage,
//   getPublicClientForChain,
//   INCREMENTS,
//   isInAppBrowser,
//   loadLastTx,
//   normalizeAmountInput,
//   openInMetaMaskDapp,
//   saveLastTx,
//   TOKENS,
//   TRANSFER_EVENT,
//   type Currency,
//   type WalletFlags,
// } from "@/components/profile/profileClientHelpers";
// import { TipThanksCard } from "@/components/profile/TipThanksCard";

// import { ProjectProgressCard } from "@/components/profile/ProjectProgressCard";

// import { WalletSection } from "@/components/profile/WalletSection";

// // ===== Public Summary Lite =====
// type PublicSummaryLite = {
//   goal: {
//     targetAmountJpyc: number;
//     achievedAt: string | null;
//     deadline: string | null;
//   } | null;
//   progress: {
//     confirmedJpyc: number;
//     targetJpyc: number | null;
//     progressPct: number;
//   } | null;
// };

// function isRecord(v: unknown): v is Record<string, unknown> {
//   return typeof v === "object" && v !== null;
// }

// /**
//  * CreatorProfile の address が「null」を返してくる（Prisma/DB）ケースを吸収する入力型。
//  * 内部では CreatorProfile に正規化して扱う。
//  */
// type CreatorProfileInput = Omit<CreatorProfile, "address"> & {
//   address?: string | null;
// };

// type Props = {
//   username: string;
//   creator: CreatorProfileInput;
//   projectId: string | null;
//   publicSummary?: PublicSummaryLite | null;
// };

// // ===== Project Progress（/api/projects/[projectId]/progress）型 =====
// type ProgressTotalsAllChains = {
//   JPYC: string | null;
//   USDC: string | null;
// };

// type ProgressByChainRow = {
//   chainId: number;
//   confirmedAmountDecimal: string | null;
//   confirmedAmountJpyc: number;
// };

// type PurposeDto = { id: string; title?: string | null };

// type ProjectProgressApi = {
//   ok: true;
//   project: { id: string; status: string; title?: string | null };
//   goal: {
//     id: string;
//     targetAmountJpyc: number;
//     achievedAt: string | null;
//     deadline?: string | null;
//   } | null;
//   progress: {
//     confirmedJpyc: number;
//     targetJpyc: number | null;
//     progressPct: number;

//     supportedJpycChainIds: number[];
//     byChain: ProgressByChainRow[];
//     totalsAllChains: ProgressTotalsAllChains;

//     perPurpose: Array<{
//       purposeId: string;
//       code: string | null;
//       label: string | null;
//       description: string | null;
//       confirmedAmountDecimal: string | null;
//       confirmedAmountJpyc: number;
//     }>;
//     noPurposeConfirmedJpyc: number;
//   };
//   purposes: PurposeDto[];
// };

// /* ========== Phase1: Project status/get 型（/api/projects/[id]） ========== */

// type ProjectStatusGet = {
//   ok: true;
//   status: string;
//   project: { id: string; status: string; title?: string | null };
//   goal: {
//     id: string;
//     targetAmountJpyc: number | null;
//     achievedAt: string | null;
//   } | null;
// };

// type GoalAchievePost = {
//   ok: true;
//   achieved: boolean;
//   alreadyAchieved?: boolean;
//   reason?: string;
//   project?: unknown;
//   goal?: unknown;
//   progress?: unknown;
// };

// /* ========== メインコンポーネント ========== */

// export default function ProfileClient({
//   username,
//   creator: creatorInput,
//   projectId,
//   publicSummary,
// }: Props) {
//   // --- creator の address null を排除して CreatorProfile に正規化 ---
//   const creator: CreatorProfile = useMemo(() => {
//     const normalizedAddress =
//       typeof creatorInput.address === "string" &&
//       creatorInput.address.length > 0
//         ? creatorInput.address
//         : undefined;

//     return {
//       ...(creatorInput as Omit<CreatorProfile, "address">),
//       address: normalizedAddress,
//     };
//   }, [creatorInput]);

//   const reverifyOnViewBusyRef = useRef(false);

//   const account = useAccount();
//   const { connector } = account;
//   const connect = useConnect();
//   const { disconnectAsync } = useDisconnect();
//   const { data: walletClient } = useWalletClient();
//   const currentChainId = useChainId();
//   const ethersProvider = useEthersProvider();
//   const publicClient = usePublicClient();

//   const DEFAULT_CHAIN: SupportedChainId = getDefaultChainId();
//   const [selectedChainId, setSelectedChainId] =
//     useState<SupportedChainId>(DEFAULT_CHAIN);

//   const [status, setStatus] = useState<string>("");
//   const [sending, setSending] = useState(false);

//   const requiredChainConfig = getChainConfig(selectedChainId);

//   const [toAddress, setToAddress] = useState<string>(creator.address ?? "");
//   const [currency, setCurrency] = useState<Currency>("JPYC");
//   const [amount, setAmount] = useState<string>(TOKENS["JPYC"].presets[0]);

//   // 既存：オンチェーン goal（creator.goalTitle / goalTargetJpyc）表示
//   const [goalCurrentJpyc, setGoalCurrentJpyc] = useState<number | null>(null);

//   const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(
//     null
//   );
//   const [walletBalancesLoading, setWalletBalancesLoading] = useState(false);

//   const [totalLast24hJpyc, setTotalLast24hJpyc] = useState<number | null>(null);

//   const isWalletConnecting =
//     account.status === "connecting" ||
//     account.status === "reconnecting" ||
//     connect.status === "pending";

//   const activeAddress = account.address ?? "";
//   const connected = account.status === "connected" && activeAddress.length > 0;

//   const connectedChainId = currentChainId ?? null;

//   // ===== Phase1 Progress/Goal states =====

//   const hasProject = !!projectId;

//   const [projectStatus, setProjectStatus] = useState<string | null>(null);
//   const [projectTitle, setProjectTitle] = useState<string | null>(null);
//   const [progressLoading, setProgressLoading] = useState(false);
//   const [progressError, setProgressError] = useState<string | null>(null);

//   const [progressTotalYen, setProgressTotalYen] = useState<number | null>(null);
//   const [progressConfirmedCount, setProgressConfirmedCount] = useState<
//     number | null
//   >(null);
//   const [progressTargetYen, setProgressTargetYen] = useState<number | null>(
//     null
//   );
//   const [progressReached, setProgressReached] = useState<boolean | null>(null);
//   const [goalAchievedAt, setGoalAchievedAt] = useState<string | null>(null);

//   // 追加：合算対象チェーン / チェーン別内訳
//   const [supportedJpycChainIds, setSupportedJpycChainIds] = useState<number[]>(
//     []
//   );
//   const [byChainJpyc, setByChainJpyc] = useState<ProgressByChainRow[]>([]);
//   const [totalsAllChains, setTotalsAllChains] =
//     useState<ProgressTotalsAllChains | null>(null);

//   // “自動達成” 実行中フラグ（連打防止）
//   const [achieving, setAchieving] = useState(false);
//   // 送金復帰パイプライン中（iOS復帰で接続が落ちても結果表示するため）
//   const [resumeBusy, setResumeBusy] = useState(false);
//   // 復帰中は appkit-button を隠して「接続を促さない」
//   const [suppressConnectUI, setSuppressConnectUI] = useState(false);

//   const [projectGoalTargetYen, setProjectGoalTargetYen] = useState<
//     number | null
//   >(null);

//   const [inApp, setInApp] = useState(false);
//   const searchParams = useSearchParams();

//   // URL例: /kazu?projectId=123&purposeId=456
//   const purposeId = searchParams.get("purposeId") || undefined;

//   // ===== チェーン選択肢（最終形は Creator/Project の許可チェーンで絞る） =====
//   const selectableChainIds: SupportedChainId[] = useMemo(() => {
//     // Phase1: Project progress が返す supportedJpycChainIds があればそれを優先
//     if (hasProject && supportedJpycChainIds.length > 0) {
//       const filtered = supportedJpycChainIds
//         .filter((id) => isSupportedChainId(id))
//         .map((id) => id as SupportedChainId);

//       if (filtered.length > 0) return filtered;
//     }

//     // それ以外は「アプリが対応する主要チェーン」を出す（最終形はここをDBで制御）
//     const fallback: SupportedChainId[] = [
//       1, // Ethereum
//       137, // Polygon
//       43114, // Avalanche
//     ].filter((id) => isSupportedChainId(id)) as SupportedChainId[];

//     return fallback.length > 0 ? fallback : [DEFAULT_CHAIN];
//   }, [hasProject, supportedJpycChainIds.join("|"), DEFAULT_CHAIN]);

//   // selectableChainIds が変わったら selectedChainId を自動整合
//   // ★ 接続中は「接続チェーンに寄せる」effect に任せる（競合防止）
//   useEffect(() => {
//     if (selectableChainIds.length === 0) return;
//     if (connected) return;

//     if (!selectableChainIds.includes(selectedChainId)) {
//       setSelectedChainId(selectableChainIds[0]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectableChainIds.join("|"), connected]);

//   // 接続したネットワークに「送金ネットワーク(selectedChainId)」を寄せる
//   useEffect(() => {
//     if (!connected) return;
//     if (currentChainId == null) return;
//     if (!isSupportedChainId(currentChainId)) return;

//     const cid = currentChainId as SupportedChainId;

//     // Project があり、対応チェーンが確定しているなら、その範囲外へは自動で寄せない
//     if (hasProject && supportedJpycChainIds.length > 0) {
//       if (!supportedJpycChainIds.includes(cid)) return;
//     }

//     // selectableChainIds の範囲外なら寄せない（UIの選択肢と整合）
//     if (!selectableChainIds.includes(cid)) return;

//     // ★ 既に同じなら更新しない（無駄な再レンダー防止）
//     setSelectedChainId((prev) => (prev === cid ? prev : cid));
//   }, [
//     connected,
//     currentChainId,
//     hasProject,
//     supportedJpycChainIds.join("|"),
//     selectableChainIds.join("|"),
//   ]);

//   // ===== ネットワーク警告の条件（修正版） =====
//   // 「接続中」かつ「ウォレットのチェーンが selectedChainId と不一致」の時だけ警告を出す
//   const onWrongChain =
//     connected && currentChainId != null && currentChainId !== selectedChainId;

//   useEffect(() => {
//     setInApp(isInAppBrowser());
//   }, []);

//   async function resumeAfterReturnFromWallet() {
//     if (typeof window === "undefined") return;

//     const last = loadLastTx();
//     if (!last) return;

//     // 古すぎるものは無視（例：10分）
//     if (Date.now() - last.createdAtMs > 10 * 60 * 1000) {
//       clearLastTx();
//       return;
//     }

//     setResumeBusy(true);
//     setSuppressConnectUI(true);

//     try {
//       setStatus("送金を確認しています…");

//       const pc = getPublicClientForChain(last.chainId);
//       if (!pc) {
//         setStatus("対応していないチェーンです");
//         return;
//       }

//       await pc.waitForTransactionReceipt({
//         hash: last.txHash,
//         timeout: 120_000,
//       });

//       if (last.projectId) {
//         const tx = await pc.getTransaction({ hash: last.txHash });

//         const token = getTokenOnChain(
//           last.currency,
//           last.chainId as SupportedChainId
//         );
//         if (!token) {
//           setStatus("トークン設定が見つかりません");
//           return;
//         }

//         await postContribution({
//           projectId: last.projectId ?? undefined,
//           purposeId: last.purposeId ?? undefined,
//           chainId: last.chainId,
//           currency: last.currency,
//           tokenAddress: token.address,
//           txHash: last.txHash,
//           fromAddress: tx.from,
//           toAddress: last.toAddress,
//           amount: last.amount,
//         });

//         await afterSendPipeline(last.txHash);
//       }

//       setStatus("送金が反映されました");
//     } catch (e) {
//       console.error("resumeAfterReturnFromWallet failed", e);
//       setStatus("送金確認に失敗しました");
//     } finally {
//       clearLastTx();
//       setResumeBusy(false);
//       setSuppressConnectUI(false);
//     }
//   }

//   useEffect(() => {
//     void resumeAfterReturnFromWallet();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   function getGlobalEthereum():
//     | (WalletFlags & { request?: unknown })
//     | undefined {
//     if (typeof window === "undefined") return undefined;
//     const w = window as Window & {
//       ethereum?: WalletFlags & { request?: unknown };
//     };
//     return w.ethereum;
//   }

//   function resolveWalletLabel(): string {
//     const eth = getGlobalEthereum();

//     if (eth?.isMetaMask) return "MetaMask";
//     if (eth?.isRabby) return "Rabby";
//     if (eth?.isCoinbaseWallet) return "Coinbase Wallet";
//     if (eth?.isOkxWallet || eth?.isOKXWallet) return "OKX Wallet";
//     if (eth?.isBinanceWallet) return "Binance Wallet";
//     if (eth?.isPhantom) return "Phantom Wallet (EVM)";
//     if (eth?.isBitgetWallet) return "Bitget Wallet";
//     if (eth?.isTokenPocket) return "TokenPocket";
//     if (eth?.isMathWallet) return "MathWallet";
//     if (eth?.isFrontier) return "Frontier Wallet";
//     if (eth?.isSafe) return "Safe (Gnosis Safe)";
//     if (eth?.isZerion) return "Zerion Wallet";
//     if (eth?.isEnkrypt) return "Enkrypt Wallet";
//     if (eth?.isTallyWallet) return "Tally Wallet";
//     if (eth?.isBraveWallet) return "Brave Wallet";
//     if (eth?.isTrust) return "Trust Wallet";
//     if (eth?.isSequence) return "Sequence Wallet";
//     if (eth?.isFrame) return "Frame Wallet";
//     if (eth?.isXDEFI) return "XDEFI Wallet";
//     if (eth?.isFireblocks) return "Fireblocks Wallet";

//     if (connector?.name) {
//       const name = connector.name;
//       const lower = name.toLowerCase();

//       if (lower.includes("hashport")) return "hashPort Wallet";
//       if (lower.includes("rabby")) return "Rabby";
//       if (lower.includes("metamask")) return "MetaMask";

//       return name;
//     }
//     return "ウォレット";
//   }

//   const [walletLabel, setWalletLabel] = useState("ウォレット");

//   useEffect(() => {
//     setWalletLabel(resolveWalletLabel());
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [connector]);

//   /* ========== Phase1: status/progress loader ========== */

//   async function fetchProjectStatusSafe() {
//     if (!projectId) return;

//     try {
//       const res = await fetch(
//         `/api/projects/${encodeURIComponent(projectId)}`,
//         {
//           method: "GET",
//           cache: "no-store",
//         }
//       );
//       if (!res.ok) {
//         setProjectStatus(null);
//         setProjectTitle(null);
//         return;
//       }
//       const json = (await res.json()) as ProjectStatusGet;
//       if (json?.ok) {
//         setProjectStatus(json.status ?? json.project?.status ?? null);

//         const t = json.project?.title ?? null;
//         setProjectTitle(typeof t === "string" && t.length > 0 ? t : null);

//         const achievedAt =
//           (json.goal?.achievedAt as string | null | undefined) ?? null;
//         if (achievedAt) setGoalAchievedAt(achievedAt);

//         const tt = json.goal?.targetAmountJpyc ?? null;
//         if (typeof tt === "number" && Number.isFinite(tt)) {
//           setProjectGoalTargetYen(tt);
//         }
//       }
//     } catch {
//       setProjectStatus(null);
//       setProjectTitle(null);
//     }
//   }

//   function toTxHashOrNull(v: unknown): `0x${string}` | null {
//     if (typeof v !== "string") return null;
//     if (!/^0x[0-9a-fA-F]{64}$/.test(v)) return null;
//     return v as `0x${string}`;
//   }

//   async function fetchPendingTxHashesSafe(): Promise<`0x${string}`[]> {
//     if (!projectId) return [];
//     try {
//       const res = await fetch(
//         `/api/projects/${encodeURIComponent(
//           projectId
//         )}/contributions?status=PENDING`,
//         { method: "GET", cache: "no-store" }
//       );
//       if (!res.ok) return [];
//       const json: unknown = await res.json().catch(() => null);
//       if (!isRecord(json) || json.ok !== true) return [];
//       const arr = (json as Record<string, unknown>).items;
//       if (!Array.isArray(arr)) return [];

//       const out: `0x${string}`[] = [];
//       for (const row of arr) {
//         if (!isRecord(row)) continue;
//         const h = toTxHashOrNull(row.txHash);
//         if (h) out.push(h);
//       }
//       return out;
//     } catch {
//       return [];
//     }
//   }

//   async function autoReverifyPendingOnView(): Promise<void> {
//     if (!projectId) return;

//     if (reverifyOnViewBusyRef.current) return;
//     reverifyOnViewBusyRef.current = true;

//     try {
//       const r = await autoReverifyPending({
//         projectId,
//         cooldownMs: 60_000,
//         maxPerView: 3,
//       });

//       if (r.verified.length > 0) {
//         await fetchProjectProgressSafe();
//         await fetchProjectStatusSafe();
//       }
//     } finally {
//       reverifyOnViewBusyRef.current = false;
//     }
//   }

//   async function fetchProjectProgressSafe(): Promise<ProjectProgressApi | null> {
//     if (!projectId) return null;

//     setProgressLoading(true);
//     setProgressError(null);

//     try {
//       const res = await fetch(
//         `/api/projects/${encodeURIComponent(projectId)}/progress`,
//         { method: "GET", cache: "no-store" }
//       );

//       if (!res.ok) {
//         const t = await res.text().catch(() => "");
//         setProgressError(`progress fetch failed: ${res.status} ${t}`);
//         return null;
//       }

//       const json = (await res.json()) as unknown;

//       if (
//         !isRecord(json) ||
//         json.ok !== true ||
//         !isRecord(json.project) ||
//         !isRecord(json.progress)
//       ) {
//         setProgressError("progress response shape mismatch");
//         return null;
//       }

//       const typed = json as ProjectProgressApi;

//       setProjectStatus(
//         typeof typed.project.status === "string" ? typed.project.status : null
//       );

//       setProjectTitle(
//         typeof typed.project.title === "string" &&
//           typed.project.title.length > 0
//           ? typed.project.title
//           : null
//       );

//       // ---- supported chains / byChain / totalsAllChains ----
//       const ids = Array.isArray(typed.progress.supportedJpycChainIds)
//         ? typed.progress.supportedJpycChainIds.filter(
//             (x): x is number => typeof x === "number" && Number.isFinite(x)
//           )
//         : [];

//       setSupportedJpycChainIds(ids);

//       const bc = Array.isArray(typed.progress.byChain)
//         ? typed.progress.byChain
//             .filter(
//               (r): r is ProgressByChainRow =>
//                 isRecord(r) &&
//                 typeof r.chainId === "number" &&
//                 Number.isFinite(r.chainId) &&
//                 typeof r.confirmedAmountJpyc === "number" &&
//                 Number.isFinite(r.confirmedAmountJpyc) &&
//                 (typeof r.confirmedAmountDecimal === "string" ||
//                   r.confirmedAmountDecimal === null)
//             )
//             .map((r) => ({
//               chainId: r.chainId,
//               confirmedAmountDecimal: r.confirmedAmountDecimal,
//               confirmedAmountJpyc: r.confirmedAmountJpyc,
//             }))
//         : [];

//       setByChainJpyc(bc);

//       const tac = typed.progress.totalsAllChains as unknown;
//       if (
//         isRecord(tac) &&
//         "JPYC" in tac &&
//         "USDC" in tac &&
//         (typeof tac.JPYC === "string" || tac.JPYC === null) &&
//         (typeof tac.USDC === "string" || tac.USDC === null)
//       ) {
//         setTotalsAllChains({ JPYC: tac.JPYC, USDC: tac.USDC });
//       } else {
//         setTotalsAllChains(null);
//       }

//       // ---- 既存：progress / goal ----
//       const confirmed = Number(typed.progress.confirmedJpyc ?? 0);
//       setProgressTotalYen(Number.isFinite(confirmed) ? confirmed : 0);

//       const target = typed.progress.targetJpyc ?? null;
//       setProgressTargetYen(
//         typeof target === "number" && Number.isFinite(target) ? target : null
//       );

//       const reached =
//         typeof target === "number" && Number.isFinite(target) && target > 0
//           ? confirmed >= target
//           : null;
//       setProgressReached(reached);

//       const achievedAt = typed.goal?.achievedAt ?? null;
//       setGoalAchievedAt(
//         typeof achievedAt === "string" && achievedAt.length > 0
//           ? achievedAt
//           : null
//       );

//       setProgressConfirmedCount(null);

//       if (typed.goal?.targetAmountJpyc != null) {
//         setProjectGoalTargetYen(typed.goal.targetAmountJpyc);
//       }

//       return typed;
//     } catch (e) {
//       setProgressError(getErrorMessage(e));
//       return null;
//     } finally {
//       setProgressLoading(false);
//     }
//   }

//   async function achieveGoalSafe(): Promise<GoalAchievePost | null> {
//     if (!projectId) return null;

//     setAchieving(true);
//     try {
//       const res = await fetch(
//         `/api/projects/${encodeURIComponent(projectId)}/goal/achieve`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           cache: "no-store",
//           body: JSON.stringify({}),
//         }
//       );

//       if (!res.ok) {
//         const t = await res.text().catch(() => "");
//         console.warn("POST /goal/achieve failed:", res.status, t);
//         return null;
//       }

//       const json = (await res.json()) as GoalAchievePost;
//       await fetchProjectStatusSafe();
//       await fetchProjectProgressSafe();
//       return json;
//     } catch (e) {
//       console.warn("POST /goal/achieve error:", e);
//       return null;
//     } finally {
//       setAchieving(false);
//     }
//   }

//   useEffect(() => {
//     if (!projectId) return;

//     void fetchProjectStatusSafe();
//     void fetchProjectProgressSafe();
//     void autoReverifyPendingOnView();

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [projectId]);

//   const MAX_PER_LOAD = 5;
//   const COOLDOWN_MS = 20_000;
//   const KEY_PREFIX = "cf:reverify:lastAttempt:";

//   function getLastAttempt(txHash: string): number {
//     try {
//       const v = localStorage.getItem(KEY_PREFIX + txHash);
//       if (!v) return 0;
//       const n = Number(v);
//       return Number.isFinite(n) ? n : 0;
//     } catch {
//       return 0;
//     }
//   }
//   function setLastAttempt(txHash: string, ms: number): void {
//     try {
//       localStorage.setItem(KEY_PREFIX + txHash, String(ms));
//     } catch {
//       // ignore
//     }
//   }

//   const attemptedThisViewRef = useMemo(
//     () => ({ set: new Set<string>() }),
//     [projectId]
//   );
//   const [autoReverifyRunning, setAutoReverifyRunning] = useState(false);

//   useEffect(() => {
//     if (!projectId) return;
//     let cancelled = false;

//     async function run(): Promise<void> {
//       if (autoReverifyRunning) return;
//       if (progressTotalYen == null && progressLoading) return;

//       setAutoReverifyRunning(true);
//       try {
//         const pending = await fetchPendingTxHashesSafe();
//         if (cancelled) return;
//         if (pending.length === 0) return;

//         const t0 = Date.now();

//         const candidates: `0x${string}`[] = [];
//         for (const h of pending) {
//           if (attemptedThisViewRef.set.has(h)) continue;

//           const last = getLastAttempt(h);
//           if (t0 - last < COOLDOWN_MS) continue;

//           candidates.push(h);
//           if (candidates.length >= MAX_PER_LOAD) break;
//         }

//         if (candidates.length === 0) return;

//         for (const h of candidates) {
//           attemptedThisViewRef.set.add(h);
//           setLastAttempt(h, t0);
//         }

//         let anyConfirmed = false;

//         for (const h of candidates) {
//           if (cancelled) return;
//           const r = await postReverify(h);
//           if (r.verified) anyConfirmed = true;
//         }

//         if (anyConfirmed && !cancelled) {
//           await fetchProjectProgressSafe();
//           await fetchProjectStatusSafe();
//         }
//       } finally {
//         if (!cancelled) setAutoReverifyRunning(false);
//       }
//     }

//     void run();

//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [projectId, progressTotalYen]);

//   /* 目標進捗 JPYC 残高 (creator.address) - readBalances ベース */

//   async function refreshGoalProgress() {
//     try {
//       if (!creator.address || !creator.goalTitle || !creator.goalTargetJpyc) {
//         return;
//       }
//       const tokenKeys: readonly TokenKey[] = ["JPYC"];
//       const balances = await readBalances({
//         chainId: selectedChainId,
//         account: creator.address as Address,
//         tokenKeys,
//       });
//       const jpyc = balances.tokens.JPYC;
//       if (!jpyc) return;

//       const human = Number(jpyc.formatted);
//       setGoalCurrentJpyc(human);
//     } catch {
//       // ignore
//     }
//   }

//   useEffect(() => {
//     if (!creator.address || !creator.goalTargetJpyc) return;
//     void refreshGoalProgress();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [creator.address, creator.goalTargetJpyc, selectedChainId]);

//   /* 接続中ウォレットの ネイティブ / JPYC 残高（selectedChainId） */

//   async function fetchWalletBalances() {
//     if (!connected || !activeAddress || onWrongChain) {
//       setWalletBalances(null);
//       setWalletBalancesLoading(false);
//       return;
//     }

//     setWalletBalancesLoading(true);
//     try {
//       const tokenKeys: readonly TokenKey[] = ["JPYC"];
//       const balances = await readBalances({
//         chainId: selectedChainId,
//         account: activeAddress as Address,
//         tokenKeys,
//       });
//       setWalletBalances(balances);
//     } catch (e) {
//       console.error("Failed to fetch wallet balances:", e);
//       setWalletBalances(null);
//     } finally {
//       setWalletBalancesLoading(false);
//     }
//   }

//   useEffect(() => {
//     void fetchWalletBalances();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [connected, activeAddress, onWrongChain, selectedChainId]);

//   /* 過去24時間の JPYC 投げ銭合計（selectedChainId 上の Transfer logs） */
//   useEffect(() => {
//     if (
//       !publicClient ||
//       !connected ||
//       !activeAddress ||
//       !creator.address ||
//       onWrongChain
//     ) {
//       setTotalLast24hJpyc(null);
//       return;
//     }

//     let cancelled = false;

//     (async () => {
//       try {
//         const latestBlock = await publicClient.getBlockNumber();
//         const latest = Number(latestBlock);
//         const approxBlocksPerDay = 43_200;
//         const fromBlock = BigInt(Math.max(latest - approxBlocksPerDay, 0));
//         const toBlock = latestBlock;

//         const jpycOnChain = getTokenOnChain("JPYC", selectedChainId);
//         if (!jpycOnChain) {
//           if (!cancelled) setTotalLast24hJpyc(null);
//           return;
//         }

//         const logs = await publicClient.getLogs({
//           address: jpycOnChain.address,
//           event: TRANSFER_EVENT,
//           args: {
//             from: activeAddress as `0x${string}`,
//             to: creator.address as `0x${string}`,
//           },
//           fromBlock,
//           toBlock,
//         });

//         let totalRaw = 0n;
//         for (const log of logs) {
//           const v = log.args.value ?? 0n;
//           totalRaw += v;
//         }

//         const total = Number(formatUnits(totalRaw, jpycOnChain.decimals ?? 18));
//         if (!cancelled) setTotalLast24hJpyc(total);
//       } catch (e) {
//         console.error("Failed to fetch last 24h tips:", e);
//         if (!cancelled) setTotalLast24hJpyc(null);
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [
//     publicClient,
//     connected,
//     activeAddress,
//     creator.address,
//     onWrongChain,
//     selectedChainId,
//   ]);

//   /* ネットワーク切り替え（MetaMaskなど拡張向けの補助） */
//   async function switchChainToSelected() {
//     const eth = getEthereum();
//     if (!eth) return;

//     const cfg = getChainConfig(selectedChainId);
//     if (!cfg) return;

//     const chainHex = `0x${cfg.id.toString(16)}`;
//     const rpcUrl = cfg.viemChain.rpcUrls.default.http[0] ?? "";

//     // まず switch を試す（登録済みならこれが速い）
//     try {
//       await eth.request({
//         method: "wallet_switchEthereumChain",
//         params: [{ chainId: chainHex }],
//       });
//       return;
//     } catch {
//       // 未登録の可能性 → add → switch
//     }

//     try {
//       await eth.request({
//         method: "wallet_addEthereumChain",
//         params: [
//           {
//             chainId: chainHex,
//             chainName: cfg.name,
//             nativeCurrency: {
//               name: cfg.nativeSymbol,
//               symbol: cfg.nativeSymbol,
//               decimals: 18,
//             },
//             rpcUrls: rpcUrl ? [rpcUrl] : [],
//             blockExplorerUrls: cfg.explorerBaseUrl ? [cfg.explorerBaseUrl] : [],
//           },
//         ],
//       });
//     } catch {
//       // ignore
//     }

//     try {
//       await eth.request({
//         method: "wallet_switchEthereumChain",
//         params: [{ chainId: chainHex }],
//       });
//     } catch {
//       // ignore
//     }
//   }

//   async function postContribution(args: {
//     projectId?: string;
//     purposeId?: string;
//     chainId: number;
//     currency: Currency;
//     tokenAddress: string;
//     txHash: string;
//     fromAddress: string;
//     toAddress: string;
//     amount: string;
//   }): Promise<{ ok: true } | { ok: false; reason: string }> {
//     if (!args.projectId) return { ok: false, reason: "PROJECT_ID_MISSING" };

//     try {
//       const res = await fetch("/api/contributions", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         cache: "no-store",
//         body: JSON.stringify({
//           projectId: String(args.projectId),
//           ...(args.purposeId === undefined
//             ? {}
//             : {
//                 purposeId:
//                   args.purposeId === null ? null : String(args.purposeId),
//               }),
//           chainId: args.chainId,
//           currency: args.currency,
//           txHash: args.txHash,
//           fromAddress: args.fromAddress,
//           toAddress: args.toAddress,
//           amount: String(args.amount),
//         }),
//       });

//       if (!res.ok) {
//         const t = await res.text().catch(() => "");
//         console.warn("POST /api/contributions failed:", res.status, t);
//         return { ok: false, reason: `HTTP_${res.status}` };
//       }

//       return { ok: true };
//     } catch (e) {
//       console.warn("POST /api/contributions error:", e);
//       return { ok: false, reason: "FETCH_FAILED" };
//     }
//   }

//   /**
//    * 送金後に：
//    * 1) contributions 登録
//    * 2) reverify で receipt 検証（PENDING→CONFIRMED）
//    * 3) progress を更新
//    * 4) reached なら goal/achieve（未達成時のみ）
//    */
//   async function afterSendPipeline(txHash: string) {
//     if (!projectId) return;

//     const maxTry = 3;
//     for (let i = 0; i < maxTry; i++) {
//       const r = await postReverify(txHash as `0x${string}`);
//       if (r.verified === true) break;
//       await new Promise((resolve) => setTimeout(resolve, 900));
//     }

//     const p = await fetchProjectProgressSafe();

//     const achievedAt =
//       (p?.goal?.achievedAt && p.goal.achievedAt.length > 0
//         ? p.goal.achievedAt
//         : null) ?? goalAchievedAt;

//     const target =
//       typeof p?.progress?.targetJpyc === "number" &&
//       Number.isFinite(p.progress.targetJpyc)
//         ? p.progress.targetJpyc
//         : null;

//     const confirmed =
//       typeof p?.progress?.confirmedJpyc === "number" &&
//       Number.isFinite(p.progress.confirmedJpyc)
//         ? p.progress.confirmedJpyc
//         : 0;

//     const reached = target != null && target > 0 ? confirmed >= target : null;

//     if (reached === true && !achievedAt) {
//       await achieveGoalSafe();
//     } else {
//       await fetchProjectStatusSafe();
//     }
//   }

//   async function disconnectWallet(): Promise<void> {
//     try {
//       await disconnectAsync();

//       if (
//         typeof (appkit as unknown as { disconnect?: () => Promise<void> })
//           .disconnect === "function"
//       ) {
//         await (
//           appkit as unknown as { disconnect: () => Promise<void> }
//         ).disconnect();
//       }

//       if (typeof window !== "undefined") {
//         const keys = Object.keys(window.localStorage);
//         for (const k of keys) {
//           if (
//             k.startsWith("wc@2:") ||
//             k.startsWith("walletconnect") ||
//             k.includes("WALLETCONNECT") ||
//             k.includes("appkit") ||
//             k.includes("reown")
//           ) {
//             window.localStorage.removeItem(k);
//           }
//         }
//       }
//     } catch (e) {
//       console.warn("disconnectWallet failed:", e);
//     }
//   }

//   /* 送金処理 */
//   async function send(overrideAmount?: string) {
//     try {
//       if (!connected) {
//         alert("ウォレットを接続してください");
//         return;
//       }
//       if (onWrongChain) {
//         alert(
//           "ネットワークを切り替えてください（下部の切替ボタンから変更できます）"
//         );
//         return;
//       }
//       if (!toAddress) {
//         alert("送金先アドレスを入力してください");
//         return;
//       }

//       if (!ethersProvider) {
//         setStatus("ウォレットプロバイダが見つかりません");
//         return;
//       }

//       setSending(true);
//       setStatus("送金中…ウォレットで承認してください");

//       const signer = await ethersProvider.getSigner();

//       const tokenKey: TokenKey = currency;
//       const tokenOnChain = getTokenOnChain(tokenKey, selectedChainId);
//       if (!tokenOnChain) {
//         setStatus("このチェーンではトークン設定がありません");
//         return;
//       }

//       const tokenAddress = tokenOnChain.address as string;
//       const decimals = tokenOnChain.decimals;

//       const code = await ethersProvider.getCode(tokenAddress);
//       if (!code || code === "0x") {
//         setStatus("指定トークンアドレスにコントラクトがありません");
//         return;
//       }

//       const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

//       const amtStr = (overrideAmount ?? amount)?.trim();
//       const human = Number(amtStr);
//       if (!Number.isFinite(human) || human <= 0) {
//         alert("金額を入力してください");
//         return;
//       }

//       const value = ethers.parseUnits(amtStr, decimals);

//       const sender = await signer.getAddress();
//       const bal: bigint = await token.balanceOf(sender);
//       if (bal < value) {
//         alert("トークン残高が不足しています");
//         return;
//       }

//       const tx = await token.transfer(toAddress, value);

//       // 復帰パイプラインは「送金チェーン＝selectedChainId」で固定する
//       saveLastTx({
//         txHash: tx.hash as `0x${string}`,
//         chainId: selectedChainId,
//         currency,
//         amount: amtStr,
//         toAddress,
//         projectId: projectId ?? null,
//         purposeId: purposeId ?? null,
//         createdAtMs: Date.now(),
//       });

//       setStatus(
//         `送金を送信しました。反映を確認中…（Tx: ${tx.hash.slice(0, 10)}…）`
//       );

//       if (publicClient) {
//         await publicClient.waitForTransactionReceipt({
//           hash: tx.hash as `0x${string}`,
//           confirmations: 1,
//           timeout: 120_000,
//         });
//       }

//       await postContribution({
//         projectId: projectId ?? undefined,
//         purposeId,
//         chainId: selectedChainId,
//         currency,
//         tokenAddress,
//         txHash: tx.hash,
//         fromAddress: sender,
//         toAddress,
//         amount: amtStr,
//       });

//       void refreshGoalProgress();
//       await afterSendPipeline(tx.hash);

//       void fetchWalletBalances();

//       const short = tx.hash.slice(0, 10);
//       const unit = currency === "JPYC" ? "円 / JPY" : "USD";
//       setStatus(`完了：${amtStr} ${unit} を送金しました（Tx: ${short}…）`);
//     } catch (e) {
//       const msg = getErrorMessage(e);
//       setStatus(`${msg} / Transaction failed.`);
//     } finally {
//       setSending(false);
//     }
//   }

//   function extractYouTubeId(url: string): string {
//     const regExp = /(?:v=|youtu\.be\/)([^&]+)/;
//     const match = url.match(regExp);
//     return match ? match[1] : "";
//   }

//   const profileAddressUrl =
//     creator.address && requiredChainConfig?.explorerBaseUrl
//       ? `${requiredChainConfig.explorerBaseUrl}/address/${creator.address}`
//       : requiredChainConfig?.explorerBaseUrl ?? "";

//   const defaultColor = "#005bbb";
//   const headerColor = creator.themeColor || defaultColor;

//   function lighten(color: string, percent: number) {
//     const num = parseInt(color.replace("#", ""), 16);
//     const r = Math.min(
//       255,
//       Math.floor((num >> 16) + (255 - (num >> 16)) * percent)
//     );
//     const g = Math.min(
//       255,
//       Math.floor(
//         ((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent
//       )
//     );
//     const b = Math.min(
//       255,
//       Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent)
//     );

//     return `rgb(${r}, ${g}, ${b})`;
//   }

//   const resolvedTargetYen =
//     progressTargetYen != null ? progressTargetYen : projectGoalTargetYen;

//   const progressPercent = useMemo(() => {
//     if (!hasProject) return null;
//     if (progressTotalYen == null || resolvedTargetYen == null) return null;
//     if (resolvedTargetYen <= 0) return null;
//     return Math.min(100, (progressTotalYen / resolvedTargetYen) * 100);
//   }, [hasProject, progressTotalYen, resolvedTargetYen]);

//   const showManualAchieveButton = useMemo(() => {
//     if (!hasProject) return false;
//     if (progressReached !== true) return false;
//     if (goalAchievedAt) return false;
//     return true;
//   }, [hasProject, progressReached, goalAchievedAt]);

//   // =========================================================
//   // 表示優先順位（要求通り）
//   // 1) DBカード（主表示）: hasProject && goal設定あり
//   // 2) Public Summary（代替）: 1が無い/goal未設定 && publicSummaryが成立
//   // 3) Legacy on-chain（互換）: 最後（or feature flag）
//   // =========================================================
//   const hasDbGoal =
//     hasProject &&
//     typeof resolvedTargetYen === "number" &&
//     Number.isFinite(resolvedTargetYen) &&
//     resolvedTargetYen > 0;

//   const hasPublicGoal = !!publicSummary?.goal && !!publicSummary?.progress;
//   const hasLegacyOnchainGoal = !!creator.goalTitle && !!creator.goalTargetJpyc;

//   const showDbCard = hasDbGoal;
//   const showPublicCard = !showDbCard && hasPublicGoal;

//   const ENABLE_LEGACY_ONCHAIN_GOAL = true;
//   const showLegacyCard =
//     ENABLE_LEGACY_ONCHAIN_GOAL && !showDbCard && !showPublicCard
//       ? hasLegacyOnchainGoal
//       : false;

//   /* ========== 表示部分 ========== */
//   return (
//     <div className="container-narrow py-8 force-light-theme">
//       <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
//         {/* プロフィールヘッダー */}
//         <ProfileHeader
//           username={username}
//           creator={creator}
//           headerColor={headerColor}
//         />

//         <div className="px-4">
//           {/* ========== 1) Phase1: Project Progress（DB集計） 主表示 ========== */}
//           {showDbCard && (
//             <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
//               <div className="p-4">
//                 <div className="flex justify-between items-start mb-2 gap-3">
//                   <div className="min-w-0">
//                     <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">
//                       Project progress (DB / CONFIRMED)
//                     </p>

//                     {projectTitle ? (
//                       <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 leading-snug break-words">
//                         {projectTitle}
//                       </p>
//                     ) : null}

//                     <p className="text-sm font-medium text-gray-800 dark:text-gray-900">
//                       {projectStatus ? `Status: ${projectStatus}` : "Status: -"}
//                     </p>

//                     {profileAddressUrl ? (
//                       <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-600">
//                         Explorer:&nbsp;
//                         <a
//                           className="underline hover:no-underline break-all"
//                           href={profileAddressUrl}
//                           target="_blank"
//                           rel="noreferrer"
//                         >
//                           {requiredChainConfig
//                             ? `${requiredChainConfig.shortName} Explorer`
//                             : "Explorer"}
//                         </a>
//                       </p>
//                     ) : null}
//                   </div>

//                   <div className="shrink-0 text-right text-xs text-gray-600 dark:text-gray-700">
//                     {progressLoading ? (
//                       <span>読み込み中… / Loading…</span>
//                     ) : (
//                       <>
//                         <span className="font-mono">
//                           {(progressTotalYen ?? 0).toLocaleString()}
//                         </span>
//                         {" / "}
//                         <span className="font-mono">
//                           {(resolvedTargetYen ?? 0).toLocaleString()}
//                         </span>
//                         <span className="ml-1">JPYC</span>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 {progressPercent != null && (
//                   <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
//                     <div
//                       className="h-full transition-all duration-500"
//                       style={{
//                         backgroundColor: headerColor,
//                         width: `${progressPercent}%`,
//                       }}
//                     />
//                   </div>
//                 )}

//                 {/* 追加：合算 + チェーン別内訳（透明性） */}
//                 <div className="mt-2 rounded-2xl border border-gray-200/70 bg-gray-50/60 px-3 py-2">
//                   <div className="flex items-start justify-between gap-3">
//                     <div className="text-[11px] text-gray-600">
//                       <div className="font-semibold text-gray-700">
//                         合算（JPYC / CONFIRMED）
//                       </div>
//                       <div className="mt-0.5">
//                         <span className="font-mono font-semibold text-gray-900">
//                           {(progressTotalYen ?? 0).toLocaleString()}
//                         </span>{" "}
//                         JPYC
//                       </div>
//                       <div className="mt-1 text-[10px] text-gray-500">
//                         ※ 合算対象: JPYC が設定されている対応チェーン（confirmed
//                         のみ）
//                       </div>
//                     </div>

//                     <div className="text-[10px] text-gray-500 text-right">
//                       {supportedJpycChainIds.length > 0 ? (
//                         <>
//                           <div className="font-semibold text-gray-600">
//                             対象チェーン
//                           </div>
//                           <div className="mt-0.5">
//                             {supportedJpycChainIds
//                               .map((id) => {
//                                 const cfg = getChainConfig(
//                                   id as SupportedChainId
//                                 );
//                                 return cfg?.shortName ?? `Chain(${id})`;
//                               })
//                               .join(" / ")}
//                           </div>
//                         </>
//                       ) : (
//                         <div className="text-gray-400">対象チェーン: -</div>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="mt-2 flex items-center justify-between gap-3">
//                   <div className="text-[11px] text-gray-500 dark:text-gray-600">
//                     {progressConfirmedCount != null ? (
//                       <span>
//                         CONFIRMED tx:{" "}
//                         <span className="font-mono">
//                           {progressConfirmedCount}
//                         </span>
//                       </span>
//                     ) : (
//                       <span>CONFIRMED tx: -</span>
//                     )}
//                     {goalAchievedAt && (
//                       <span className="ml-2">
//                         AchievedAt:{" "}
//                         <span className="font-mono">
//                           {String(goalAchievedAt)}
//                         </span>
//                       </span>
//                     )}
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <button
//                       type="button"
//                       className="btn-secondary text-xs"
//                       onClick={() => {
//                         void fetchProjectStatusSafe();
//                         void fetchProjectProgressSafe();
//                       }}
//                       disabled={progressLoading || achieving}
//                     >
//                       進捗を更新 / Refresh
//                     </button>

//                     {showManualAchieveButton && (
//                       <button
//                         type="button"
//                         className="btn-secondary text-xs"
//                         onClick={() => void achieveGoalSafe()}
//                         disabled={achieving || progressLoading}
//                         style={{
//                           borderColor: headerColor,
//                           color: headerColor,
//                         }}
//                       >
//                         目標達成を確定 / Achieve
//                       </button>
//                     )}
//                   </div>
//                 </div>

//                 {/* ---- 合算対象チェーン & チェーン別内訳 ---- */}
//                 <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
//                   <div className="text-[11px] font-semibold text-gray-700">
//                     合算対象（JPYC / CONFIRMED）
//                   </div>

//                   <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
//                     本アプリが対応するチェーンのうち、JPYC
//                     が登録されているチェーンのみを合算します（CONFIRMED のみ）。
//                     対象チェーンは API の{" "}
//                     <span className="font-mono">supportedJpycChainIds</span>{" "}
//                     と一致します。
//                   </div>

//                   <div className="mt-2 text-[11px] text-gray-600">
//                     合算（JPYC / CONFIRMED）:{" "}
//                     <span className="font-mono font-semibold text-gray-900">
//                       {(progressTotalYen ?? 0).toLocaleString()}
//                     </span>{" "}
//                     JPYC
//                   </div>

//                   <div className="mt-2 text-[10px] text-gray-500">
//                     対象チェーン:{" "}
//                     {supportedJpycChainIds.length > 0
//                       ? supportedJpycChainIds
//                           .map((id) => {
//                             const cfg = getChainConfig(id as SupportedChainId);
//                             return cfg?.shortName ?? `Chain(${id})`;
//                           })
//                           .join(" / ")
//                       : "-"}
//                   </div>

//                   {byChainJpyc.length > 0 ? (
//                     <div className="mt-2 space-y-1">
//                       <div className="text-[11px] text-gray-500">
//                         チェーン別内訳
//                       </div>

//                       <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
//                         {byChainJpyc.map((r) => {
//                           const cfg = getChainConfig(
//                             r.chainId as SupportedChainId
//                           );
//                           const label = cfg?.shortName ?? `Chain(${r.chainId})`;
//                           return (
//                             <div
//                               key={String(r.chainId)}
//                               className="flex items-center justify-between px-3 py-2"
//                             >
//                               <div className="text-[12px] text-gray-800">
//                                 {label}
//                               </div>
//                               <div className="text-[12px] font-mono font-semibold text-gray-900">
//                                 {Number(r.confirmedAmountJpyc).toLocaleString()}{" "}
//                                 JPYC
//                               </div>
//                             </div>
//                           );
//                         })}
//                       </div>

//                       {totalsAllChains ? (
//                         <div className="mt-2 text-[11px] text-gray-500">
//                           参考（全チェーン合算 / CONFIRMED）:{" "}
//                           <span className="font-mono">
//                             JPYC {totalsAllChains.JPYC ?? "0"} / USDC{" "}
//                             {totalsAllChains.USDC ?? "0"}
//                           </span>
//                         </div>
//                       ) : null}
//                     </div>
//                   ) : (
//                     <div className="mt-2 text-[11px] text-gray-500">
//                       チェーン別内訳はありません（CONFIRMED
//                       が無い、または集計対象外の可能性があります）
//                     </div>
//                   )}
//                 </div>

//                 {progressError && (
//                   <p className="mt-2 text-[11px] text-rose-600 break-all">
//                     {progressError}
//                   </p>
//                 )}

//                 {progressReached === true && !goalAchievedAt && (
//                   <p className="mt-2 text-[11px] text-emerald-700">
//                     目標金額に到達しています。送金後は自動で達成確定を試行します（反映遅延がある場合は「Achieve」を押してください）。
//                   </p>
//                 )}

//                 {goalAchievedAt && (
//                   <p className="mt-2 text-[11px] text-emerald-700">
//                     目標達成が確定済みです。
//                   </p>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* ========== 2) Public Summary Goal（/api/public/creator の要約） 代替表示 ========== */}
//           {showPublicCard ? (
//             <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
//               <div className="p-4 space-y-2">
//                 <div className="flex items-center justify-between">
//                   <div className="text-sm font-semibold text-gray-900 dark:text-gray-900">
//                     Goal
//                   </div>
//                   {publicSummary?.goal?.achievedAt ? (
//                     <span className="text-[11px] text-emerald-700">
//                       達成済み
//                     </span>
//                   ) : null}
//                 </div>

//                 <div className="text-xs text-gray-500 dark:text-gray-600">
//                   目標:{" "}
//                   {publicSummary?.goal
//                     ? formatJpyc(publicSummary.goal.targetAmountJpyc)
//                     : "-"}{" "}
//                   JPYC
//                   {publicSummary?.goal?.deadline ? (
//                     <span className="ml-2">
//                       期限: {publicSummary.goal.deadline.slice(0, 10)}
//                     </span>
//                   ) : null}
//                 </div>

//                 <div className="text-sm text-gray-800 dark:text-gray-900">
//                   現在:{" "}
//                   {publicSummary?.progress
//                     ? formatJpyc(publicSummary.progress.confirmedJpyc)
//                     : "-"}{" "}
//                   JPYC
//                 </div>

//                 <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
//                   <div
//                     className="h-2"
//                     style={{
//                       backgroundColor: headerColor,
//                       width: `${clampPct(
//                         publicSummary?.progress?.progressPct ?? 0
//                       )}%`,
//                     }}
//                   />
//                 </div>

//                 <div className="text-[11px] text-gray-500 dark:text-gray-600">
//                   {Math.floor(
//                     clampPct(publicSummary?.progress?.progressPct ?? 0)
//                   )}
//                   % 達成
//                 </div>
//               </div>
//             </div>
//           ) : null}

//           {/* ========== 3) Legacy: オンチェーン goal 表示（互換・最後） ========== */}
//           {showLegacyCard && (
//             <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
//               <div className="p-4">
//                 <div className="flex justify-between items-baseline mb-2">
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">
//                       目標 / Goal (on-chain balance)
//                     </p>
//                     <p className="text-sm font-medium text-gray-800 dark:text-gray-900">
//                       {creator.goalTitle}
//                     </p>
//                   </div>
//                   <div className="text-right text-xs text-gray-600 dark:text-gray-700">
//                     {goalCurrentJpyc != null ? (
//                       <>
//                         <span className="font-mono">
//                           {Math.min(
//                             goalCurrentJpyc,
//                             creator.goalTargetJpyc as number
//                           ).toLocaleString()}
//                         </span>
//                         {" / "}
//                         <span className="font-mono">
//                           {(creator.goalTargetJpyc as number).toLocaleString()}
//                         </span>
//                         <span className="ml-1">JPYC</span>
//                       </>
//                     ) : (
//                       <span>読み込み中… / Loading…</span>
//                     )}
//                   </div>
//                 </div>

//                 <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
//                   <div
//                     className="h-full transition-all duration-500"
//                     style={{
//                       backgroundColor: headerColor,
//                       width: `${Math.min(
//                         100,
//                         goalCurrentJpyc != null && creator.goalTargetJpyc
//                           ? (goalCurrentJpyc / creator.goalTargetJpyc) * 100
//                           : 0
//                       )}%`,
//                     }}
//                   />
//                 </div>

//                 <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-600 leading-relaxed">
//                   <p>
//                     Explorer:&nbsp;
//                     <a
//                       className="underline hover:no-underline break-all"
//                       href={profileAddressUrl}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       {requiredChainConfig
//                         ? `${requiredChainConfig.shortName} Explorer`
//                         : "Explorer"}
//                     </a>
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ウォレット接続エリア */}
//           <div className="mt-6 w-full rounded-2xl border border-gray-200 dark:border-gray-300 bg-white/95 dark:bg-white/95 backdrop-blur p-4 sm:p-5 space-y-3">
//             <div className="text-center">
//               <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
//                 Wallet
//               </p>
//               <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-900">
//                 {connected
//                   ? `${walletLabel} に接続済み`
//                   : isWalletConnecting
//                   ? "ウォレットに接続中…"
//                   : "ウォレットに接続して投げ銭する"}
//               </h3>
//             </div>

//             <div className="grid place-items-center">
//               <div className="w-full flex justify-center">
//                 {suppressConnectUI ? (
//                   <div className="flex flex-col items-center gap-2">
//                     <div className="text-[11px] text-gray-500">
//                       送金結果を確認中…（再接続は不要です）
//                     </div>
//                     <div className="text-[11px] text-gray-400">
//                       画面を閉じずにお待ちください
//                     </div>
//                   </div>
//                 ) : !connected ? (
//                   <div className="flex flex-col items-center gap-2">
//                     <appkit-button />
//                     {isWalletConnecting && (
//                       <div className="text-[11px] text-gray-500">
//                         接続処理中…
//                       </div>
//                     )}
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center gap-2">
//                     <div className="text-[11px] text-gray-500">
//                       {activeAddress
//                         ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(
//                             -4
//                           )}`
//                         : "接続済み"}
//                     </div>

//                     <button
//                       type="button"
//                       className="btn-secondary text-xs"
//                       onClick={() => void disconnectWallet()}
//                       disabled={isWalletConnecting || sending || resumeBusy}
//                     >
//                       切断 / Disconnect
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {inApp && !connected && (
//               <>
//                 <p className="mt-2 text-[11px] text-center text-amber-700 dark:text-amber-700 leading-relaxed">
//                   アプリ内ブラウザではウォレットアプリが起動しない場合があります。
//                   「ブラウザで開く」または「MetaMaskアプリで開く」からアクセスしてください。
//                 </p>
//                 <div className="mt-1 flex justify-center">
//                   <button
//                     type="button"
//                     className="btn-secondary text-xs"
//                     onClick={openInMetaMaskDapp}
//                   >
//                     MetaMaskアプリで開く
//                   </button>
//                 </div>
//               </>
//             )}

//             {/* 接続状態表示＋残高 */}
//             <div className="mt-2 text-center">
//               {connected ? (
//                 <>
//                   {!onWrongChain && (
//                     <div
//                       className="
//                         mt-3 px-5 py-4
//                         border border-gray-200
//                         rounded-2xl
//                         bg-white
//                         shadow-sm
//                         inline-block
//                         text-left
//                         w-[260px]
//                       "
//                     >
//                       <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                         ウォレット残高
//                       </p>

//                       {walletBalancesLoading && (
//                         <div className="text-xs text-gray-500">読み込み中…</div>
//                       )}

//                       {!walletBalancesLoading && walletBalances && (
//                         <div className="space-y-2 text-sm text-gray-700">
//                           <div className="flex justify-between items-center">
//                             <div className="flex items-center gap-2">
//                               <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
//                               <span>
//                                 {walletBalances.nativeSymbol ??
//                                   requiredChainConfig?.nativeSymbol ??
//                                   "Native"}
//                                 （ガス代）
//                               </span>
//                             </div>
//                             <span className="font-mono font-semibold">
//                               {(() => {
//                                 const v = Number(
//                                   walletBalances.nativeFormatted
//                                 );
//                                 if (!Number.isFinite(v)) {
//                                   return `0 ${
//                                     walletBalances.nativeSymbol ??
//                                     requiredChainConfig?.nativeSymbol ??
//                                     "Native"
//                                   }`;
//                                 }
//                                 const formatted =
//                                   v >= 0.001
//                                     ? v.toFixed(4)
//                                     : v.toExponential(2);
//                                 return `${formatted} ${
//                                   walletBalances.nativeSymbol ??
//                                   requiredChainConfig?.nativeSymbol ??
//                                   "Native"
//                                 }`;
//                               })()}
//                             </span>
//                           </div>

//                           <div className="flex justify-between items-center">
//                             <div className="flex items-center gap-2">
//                               <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
//                               <span>JPYC</span>
//                             </div>
//                             <span className="font-mono font-semibold">
//                               {(() => {
//                                 const jpyc = walletBalances.tokens?.JPYC;
//                                 if (!jpyc) return "…";
//                                 const v = Number(jpyc.formatted);
//                                 if (!Number.isFinite(v)) return "0 JPYC";
//                                 const int = Math.floor(v);
//                                 return `${int.toLocaleString()} JPYC`;
//                               })()}
//                             </span>
//                           </div>
//                         </div>
//                       )}

//                       {!walletBalancesLoading && !walletBalances && (
//                         <div className="text-xs text-gray-500">
//                           残高を取得できませんでした
//                         </div>
//                       )}

//                       <div className="mt-3 flex justify-end">
//                         <button
//                           type="button"
//                           className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
//                           onClick={() => void fetchWalletBalances()}
//                           disabled={walletBalancesLoading}
//                         >
//                           残高を更新 / Refresh
//                         </button>
//                       </div>
//                     </div>
//                   )}

//                   <div className="mt-3 flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-600">
//                     <div>
//                       接続中ネットワーク:{" "}
//                       <span className="font-medium">
//                         {currentChainId !== undefined
//                           ? getChainConfig(currentChainId as SupportedChainId)
//                               ?.shortName ?? `Chain(${currentChainId})`
//                           : "未接続"}
//                       </span>
//                     </div>
//                   </div>

//                   {/* 送金チェーン・通貨・送金UI（ネットワーク一致時のみ） */}
//                   {connected && !onWrongChain && (
//                     <>
//                       <div className="mt-6 mb-2 text-center">
//                         <h3
//                           className="text-base sm:text-lg font-semibold"
//                           style={{ color: headerColor }}
//                         >
//                           {creator.displayName || username} さんへの投げ銭
//                         </h3>
//                       </div>

//                       {/* チェーン選択 */}
//                       <div className="mt-6">
//                         <label className="text-sm font-medium text-gray-700 dark:text-gray-800">
//                           ネットワーク / Network
//                         </label>
//                         <div className="mt-1">
//                           <select
//                             className="input w-52 px-2 py-2 text-sm"
//                             value={String(selectedChainId)}
//                             onChange={(e) => {
//                               const v = Number(e.target.value);
//                               if (!isSupportedChainId(v)) return;
//                               setSelectedChainId(v as SupportedChainId);
//                             }}
//                           >
//                             {selectableChainIds.map((id) => {
//                               const cfg = getChainConfig(id);
//                               return (
//                                 <option key={String(id)} value={String(id)}>
//                                   {cfg?.name ?? `Chain(${id})`}
//                                 </option>
//                               );
//                             })}
//                           </select>
//                         </div>
//                         <div className="mt-1 text-[11px] text-gray-500">
//                           ※
//                           この「送金ネットワーク」に合わせてウォレット側も切り替えてください
//                         </div>
//                       </div>

//                       {/* 通貨 */}
//                       <div className="mt-4">
//                         <label className="text-sm font-medium text-gray-700 dark:text-gray-800">
//                           通貨 / Currency
//                         </label>
//                         <div className="mt-1">
//                           <select
//                             className="input w-28 px-2 py-2 text-sm"
//                             value={currency}
//                             onChange={(e) => {
//                               const c = e.target.value as Currency;
//                               setCurrency(c);
//                               setAmount(TOKENS[c].presets[0]);
//                             }}
//                           >
//                             <option value="JPYC">JPYC</option>
//                             <option value="USDC">USDC</option>
//                           </select>
//                         </div>
//                       </div>

//                       <div className="mt-4 space-y-3">
//                         <label className="block text-sm text-gray-700 dark:text-gray-800">
//                           送金金額 / Amount to send
//                         </label>

//                         <div className="flex items-center gap-2">
//                           <input
//                             type="text"
//                             inputMode={
//                               currency === "JPYC" ? "numeric" : "decimal"
//                             }
//                             className="input flex-1 px-3 py-2"
//                             placeholder={
//                               currency === "JPYC"
//                                 ? "例）150（円） / e.g. 150"
//                                 : "例）1.25（USD） / e.g. 1.25"
//                             }
//                             value={amount}
//                             onChange={(e) =>
//                               setAmount(
//                                 normalizeAmountInput(e.target.value, currency)
//                               )
//                             }
//                             onKeyDown={(e) => {
//                               if (e.key === "Enter") {
//                                 e.preventDefault();
//                                 const v = normalizeAmountInput(
//                                   amount,
//                                   currency
//                                 );
//                                 if (v) void send(v);
//                               }
//                             }}
//                           />

//                           <span className="text-sm text-gray-500 dark:text-gray-700">
//                             {currency === "JPYC" ? "円 / JPYC" : "USD"}
//                           </span>

//                           <button
//                             style={{
//                               backgroundColor: headerColor,
//                               color: "#fff",
//                               padding: "0.5rem 1rem",
//                               borderRadius: "0.75rem",
//                               fontWeight: 600,
//                               transition: "0.2s",
//                             }}
//                             onMouseOver={(e) => {
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.backgroundColor = lighten(
//                                 headerColor,
//                                 0.25
//                               );
//                             }}
//                             onMouseOut={(e) => {
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.backgroundColor = headerColor;
//                             }}
//                             onClick={() => {
//                               const v = normalizeAmountInput(amount, currency);
//                               if (v) void send(v);
//                             }}
//                             disabled={sending || !amount}
//                           >
//                             投げ銭 / Send
//                           </button>
//                         </div>

//                         <div className="flex gap-3">
//                           {INCREMENTS[currency].map((delta) => {
//                             const label =
//                               currency === "JPYC"
//                                 ? `+${delta} JPYC`
//                                 : `+${delta} USD`;

//                             return (
//                               <button
//                                 key={delta}
//                                 type="button"
//                                 style={{
//                                   flex: 1,
//                                   minHeight: "48px",
//                                   backgroundColor: headerColor,
//                                   color: "white",
//                                   borderRadius: "0.75rem",
//                                   fontWeight: 600,
//                                   transition: "0.2s",
//                                 }}
//                                 onMouseOver={(e) => {
//                                   (
//                                     e.currentTarget as HTMLButtonElement
//                                   ).style.backgroundColor = lighten(
//                                     headerColor,
//                                     0.25
//                                   );
//                                 }}
//                                 onMouseOut={(e) => {
//                                   (
//                                     e.currentTarget as HTMLButtonElement
//                                   ).style.backgroundColor = headerColor;
//                                 }}
//                                 onClick={() => {
//                                   setAmount((prev) =>
//                                     addAmount(prev, delta, currency)
//                                   );
//                                 }}
//                                 disabled={sending}
//                               >
//                                 {label}
//                               </button>
//                             );
//                           })}
//                         </div>

//                         <div className="mt-6 mb-2 text-center">
//                           <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">
//                             送金先を間違えないようご確認ください
//                           </p>
//                         </div>

//                         {hasProject && (
//                           <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-600 text-center">
//                             Project contribution is enabled (projectId:{" "}
//                             <span className="font-mono">{projectId}</span>)
//                             {purposeId && (
//                               <>
//                                 {" "}
//                                 / purposeId:{" "}
//                                 <span className="font-mono">{purposeId}</span>
//                               </>
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     </>
//                   )}

//                   <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-600 mt-2">
//                     <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
//                     <span>接続中</span>
//                   </div>
//                 </>
//               ) : (
//                 <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-600">
//                   <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
//                   <span>未接続</span>
//                 </div>
//               )}
//             </div>

//             {/* ネットワーク警告（修正済み条件：selectedChainId と不一致の時だけ） */}
//             {connected && onWrongChain && (
//               <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/80 dark:border-amber-300/80 dark:bg-amber-50/80 p-3 text-amber-800">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="text-xs sm:text-sm">
//                     ネットワークが違います。選択中のネットワークに切り替えてください。
//                     <div className="mt-1 text-[11px] text-amber-800/90">
//                       選択中:{" "}
//                       <span className="font-semibold">
//                         {getChainConfig(selectedChainId)?.shortName ??
//                           `Chain(${selectedChainId})`}
//                       </span>{" "}
//                       / 接続中:{" "}
//                       <span className="font-semibold">
//                         {connectedChainId != null
//                           ? getChainConfig(connectedChainId as SupportedChainId)
//                               ?.shortName ?? `Chain(${connectedChainId})`
//                           : "-"}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="shrink-0">
//                     <appkit-network-button />
//                   </div>
//                 </div>
//                 <button
//                   type="button"
//                   className="mt-2 inline-flex items-center gap-1 text-[11px] underline hover:no-underline"
//                   onClick={() => void switchChainToSelected()}
//                 >
//                   ブラウザ拡張のMetaMaskで切り替える
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* 過去24時間サンクスカード */}
//           {connected &&
//             !onWrongChain &&
//             totalLast24hJpyc != null &&
//             totalLast24hJpyc > 0 && (
//               <div className="mt-4 flex justify-center">
//                 <TipThanksCard
//                   amountYen={totalLast24hJpyc}
//                   artistName={creator.displayName || username}
//                 />
//               </div>
//             )}

//           {/* ステータス */}
//           <p
//             className="mt-4 text-sm text-center text-gray-700 dark:text-gray-800 min-h-6"
//             aria-live="polite"
//           >
//             {status}
//           </p>

//           {/* YouTube 動画ブロック */}
//           {creator.youtubeVideos && creator.youtubeVideos.length > 0 && (
//             <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-50 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-300">
//               <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-900 mb-2">
//                 🎬 紹介動画 / Featured Videos
//               </h3>

//               {creator.youtubeVideos.map((v, idx) => (
//                 <div key={idx} className="mb-6 last:mb-0">
//                   <a
//                     href={v.url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="block"
//                   >
//                     <img
//                       src={`https://img.youtube.com/vi/${extractYouTubeId(
//                         v.url
//                       )}/hqdefault.jpg`}
//                       alt={v.title}
//                       className="rounded-xl w-full mb-2 shadow-sm hover:opacity-90 transition"
//                     />
//                   </a>

//                   <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-900 mb-2 mt-4">
//                     {v.title}
//                   </h4>

//                   <p className="text-sm text-gray-600 dark:text-gray-700 leading-relaxed mb-3">
//                     {v.description}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           )}

//           <PromoCreatorFounding headerColor={headerColor} />
//           <PromoGasSupport headerColor={headerColor} />
//           <PromoJpycEx headerColor={headerColor} />

//           {/* フッター */}
//           <footer
//             className="mt-8 -mx-4 sm:-mx-6 px-6 py-5 text-center text-[11px] leading-relaxed text-white/90 space-y-3"
//             style={{
//               backgroundColor: defaultColor,
//               backgroundImage:
//                 "linear-gradient(135deg, rgba(255,255,255,0.16), transparent 45%)",
//             }}
//           >
//             <div className="flex justify-center mb-2">
//               <img
//                 src="/icon/creator_founding_white.svg"
//                 alt="creator founding logo"
//                 className="w-[170px] h-auto opacity-90"
//               />
//             </div>

//             <p>
//               ※本サービスは、クリエイター応援を目的とした個人学習による無償提供のUIツールです。
//               <br />
//               ※本サービス（コンテンツ・作品等）はJPYC株式会社の公式コンテンツではありません。
//               <br />
//               ※「JPYC」はJPYC株式会社が提供する1号電子決済手段（ステーブルコイン）です。
//               <br />
//               ※JPYCおよびJPYCロゴは、JPYC株式会社の登録商標です。
//               <br />
//               ※JPYC / USDC
//               の送付は外部ウォレットで実行され、本サービスは送付処理に関与しません。
//             </p>

//             <p>
//               注意：本サイトの投げ銭は<strong>無償の応援</strong>
//               です。返金や金銭的・物品的な対価は一切発生しません。 / This tip is{" "}
//               <strong>purely voluntary support</strong>. No refund or
//               financial/material reward is provided.
//             </p>
//           </footer>
//         </div>
//       </div>
//     </div>
//   );
// }
