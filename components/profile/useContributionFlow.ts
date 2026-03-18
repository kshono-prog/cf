"use client";

import { postReverify } from "@/lib/reverifyClient";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { SelectedPostTipContext } from "@/components/feed/feedTypes";
import type { ProjectProgressApi } from "@/components/profile/useProjectProgress";
import type { Currency } from "@/components/profile/profileClientHelpers";

type GoalAchievePost = {
  ok: true;
  achieved: boolean;
  alreadyAchieved?: boolean;
  reason?: string;
  project?: unknown;
  goal?: unknown;
  progress?: unknown;
};

type PostContributionArgs = {
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
};

type Args = {
  activeProjectId: string | null;
  viewerAddress: string | null;
  goalAchievedAt: string | null;
  selectedPostTipContext: SelectedPostTipContext | null;
  fetchProjectProgressSafe: () => Promise<ProjectProgressApi | null>;
  setFeedRefreshToken: React.Dispatch<React.SetStateAction<number>>;
  setSelectedPostTipContext: React.Dispatch<
    React.SetStateAction<SelectedPostTipContext | null>
  >;
};

export function useContributionFlow({
  activeProjectId,
  viewerAddress,
  goalAchievedAt,
  selectedPostTipContext,
  fetchProjectProgressSafe,
  setFeedRefreshToken,
  setSelectedPostTipContext,
}: Args) {
  async function achieveGoalSafe(): Promise<GoalAchievePost | null> {
    if (!activeProjectId || !viewerAddress) return null;

    try {
      const response = await ownerAuthFetch({
        address: viewerAddress,
        url: `/api/projects/${encodeURIComponent(activeProjectId)}/goal/achieve`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ address: viewerAddress }),
        },
      });

      if (!response.ok) return null;

      const result = (await response.json()) as GoalAchievePost;
      await fetchProjectProgressSafe();
      return result;
    } catch {
      return null;
    }
  }

  async function postContribution(
    args: PostContributionArgs
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
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
            : { purposeId: args.purposeId === null ? null : String(args.purposeId) }),
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
      typeof targetRaw === "number" && Number.isFinite(targetRaw) ? targetRaw : null;
    const confirmed =
      typeof confirmedRaw === "number" && Number.isFinite(confirmedRaw) ? confirmedRaw : 0;
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

  return { postContribution, afterSendPipeline };
}
