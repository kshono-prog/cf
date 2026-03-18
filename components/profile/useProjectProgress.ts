"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autoReverifyPending, postReverify } from "@/lib/reverifyClient";
import { buildSupportProjectView, type SupportProfileView } from "@/lib/supportProfileView";
import { isRecord } from "@/lib/publicSummary";
import { getErrorMessage, type Currency } from "@/components/profile/profileClientHelpers";

type ProgressByChainRow = {
  chainId: number;
  confirmedAmountDecimal: string | null;
  confirmedAmountJpyc: number;
};

type ProgressSupportedChainIdsByCurrency = {
  JPYC: number[];
  USDC: number[];
};

export type ProjectProgressApi = {
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
    confirmedByCurrency?: { JPYC: number; USDC: number };
    targetAmount?: number | null;
    targetJpyc: number | null;
    progressPct: number;
    supportedChainIds?: number[];
    supportedJpycChainIds: number[];
    supportedChainIdsByCurrency?: ProgressSupportedChainIdsByCurrency;
    byChain: ProgressByChainRow[];
    byChainByCurrency?: { JPYC: ProgressByChainRow[]; USDC: ProgressByChainRow[] };
    totalsAllChains: { JPYC: string | null; USDC: string | null };
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
  purposes: Array<{ id: string; title?: string | null }>;
};

type Args = {
  activeProjectId: string | null;
  creatorDisplayName: string;
  creatorProfile: string | null;
  username: string;
  viewerIsOwner: boolean;
  activeSupportProjectConfirmedAmount: number | undefined;
  onSupportProfileUpdate: (
    updateFn: (current: SupportProfileView) => SupportProfileView
  ) => void;
};

export function useProjectProgress({
  activeProjectId,
  creatorDisplayName,
  creatorProfile,
  username,
  viewerIsOwner,
  activeSupportProjectConfirmedAmount,
  onSupportProfileUpdate,
}: Args) {
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [goalAchievedAt, setGoalAchievedAt] = useState<string | null>(null);
  const [supportedJpycChainIds, setSupportedJpycChainIds] = useState<number[]>([]);
  const [supportedChainIdsByCurrency, setSupportedChainIdsByCurrency] =
    useState<ProgressSupportedChainIdsByCurrency>({ JPYC: [], USDC: [] });
  const [autoReverifyRunning, setAutoReverifyRunning] = useState(false);

  const reverifyOnViewBusyRef = useRef(false);
  const attemptedThisViewRef = useRef<{ set: Set<string> }>({ set: new Set<string>() });

  const fetchProjectProgressSafe = useCallback(async (): Promise<ProjectProgressApi | null> => {
    if (!activeProjectId) return null;

    setProgressLoading(true);
    setProgressError(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}/progress`,
        { method: "GET", cache: "no-store" }
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
            (value): value is number => typeof value === "number" && Number.isFinite(value)
          )
        : [];
      const idsAll = Array.isArray(typed.progress.supportedChainIds)
        ? typed.progress.supportedChainIds.filter(
            (value): value is number => typeof value === "number" && Number.isFinite(value)
          )
        : [];

      onSupportProfileUpdate((current) => {
        const currency = typed.progress.currency === "USDC" ? "USDC" : "JPYC";
        const nextProject = buildSupportProjectView({
          projectId: typed.project.id,
          currency,
          title:
            typeof typed.project.title === "string" && typed.project.title.length > 0
              ? typed.project.title
              : `${creatorDisplayName || username}の活動を応援する`,
          description: creatorProfile ?? null,
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
            (value): value is number => typeof value === "number" && Number.isFinite(value)
          ),
          USDC: byCurrency.USDC.filter(
            (value): value is number => typeof value === "number" && Number.isFinite(value)
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
  }, [
    activeProjectId,
    creatorDisplayName,
    creatorProfile,
    onSupportProfileUpdate,
    username,
  ]);

  const fetchPendingTxHashesSafe = useCallback(async (): Promise<`0x${string}`[]> => {
    if (!activeProjectId) return [];

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}/contributions?status=PENDING`,
        { method: "GET", cache: "no-store", credentials: "include" }
      );
      if (!response.ok) return [];
      const json: unknown = await response.json().catch(() => null);
      const rows =
        isRecord(json) && json.ok === true
          ? Array.isArray(json.contributions)
            ? json.contributions
            : Array.isArray(json.items)
              ? json.items
              : null
          : null;
      if (!rows) return [];

      return rows
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

  // Initial progress fetch
  useEffect(() => {
    if (!activeProjectId) return;

    attemptedThisViewRef.current.set.clear();
    void fetchProjectProgressSafe();
    if (viewerIsOwner) {
      void autoReverifyPendingOnView();
    }
  }, [
    activeProjectId,
    autoReverifyPendingOnView,
    fetchProjectProgressSafe,
    viewerIsOwner,
  ]);

  // Background reverify for pending transactions
  useEffect(() => {
    if (!activeProjectId || !viewerIsOwner) return;
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
    activeSupportProjectConfirmedAmount,
    autoReverifyRunning,
    fetchPendingTxHashesSafe,
    fetchProjectProgressSafe,
    progressLoading,
    viewerIsOwner,
  ]);

  return {
    progressLoading,
    progressError,
    goalAchievedAt,
    supportedJpycChainIds,
    supportedChainIdsByCurrency,
    autoReverifyRunning,
    fetchProjectProgressSafe,
  };
}
