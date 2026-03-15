"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PublicViewerState } from "@/lib/publicViewerState";

type FollowPreview = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type FollowSummary = {
  creator: FollowPreview;
  counts: {
    followers: number;
    following: number;
  };
  viewer: {
    hasUser: boolean;
    isOwner: boolean;
    follows: boolean;
  };
  followers: FollowPreview[];
};

type Props = {
  username: string;
  viewerAddress: string | null;
  viewerState: PublicViewerState;
  managementHref: string;
  registrationHref: string;
  onRequireConnection: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePreview(value: unknown): FollowPreview | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const username = toStringOrNull(value.username);
  const displayName = toStringOrNull(value.displayName);
  const avatarUrl =
    value.avatarUrl === null ? null : toStringOrNull(value.avatarUrl);

  if (!id || !username || !displayName || avatarUrl === undefined) return null;

  return {
    id,
    username,
    displayName,
    avatarUrl,
  };
}

function parseFollowSummary(value: unknown): FollowSummary {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.counts) ||
    !isRecord(value.viewer) ||
    !Array.isArray(value.followers)
  ) {
    throw new Error("FOLLOW_SUMMARY_INVALID");
  }

  const creator = parsePreview(value.creator);
  const followers = toNumberOrNull(value.counts.followers);
  const following = toNumberOrNull(value.counts.following);
  if (!creator || followers === null || following === null) {
    throw new Error("FOLLOW_SUMMARY_INVALID");
  }

  return {
    creator,
    counts: {
      followers,
      following,
    },
    viewer: {
      hasUser: value.viewer.hasUser === true,
      isOwner: value.viewer.isOwner === true,
      follows: value.viewer.follows === true,
    },
    followers: value.followers
      .map((item) => parsePreview(item))
      .filter((item): item is FollowPreview => item !== null),
  };
}

function countLabel(value: number): string {
  return value.toLocaleString("ja-JP");
}

function mapActionError(message: string): string {
  switch (message) {
    case "ADDRESS_REQUIRED":
      return "フォローするにはウォレット接続が必要です。";
    case "VIEWER_NOT_REGISTERED":
      return "フォローするには先にユーザー登録をしてください。";
    case "CANNOT_FOLLOW_SELF":
      return "自分自身はフォローできません。";
    default:
      return "フォローの更新に失敗しました。";
  }
}

export function CreatorCommunityCard(props: Props) {
  const [summary, setSummary] = useState<FollowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (props.viewerAddress) {
      params.set("viewerAddress", props.viewerAddress);
    }
    const suffix = params.toString();
    return suffix ? `?${suffix}` : "";
  }, [props.viewerAddress]);

  const fetchSummary = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/creators/${encodeURIComponent(props.username)}/follow${query}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error("FOLLOW_FETCH_FAILED");
      }
      setSummary(parseFollowSummary(json));
    } catch {
      setError("フォロワー情報を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, [props.username, query]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  async function handleToggleFollow(): Promise<void> {
    if (!props.viewerAddress) {
      props.onRequireConnection();
      return;
    }
    if (props.viewerState.mode === "loading") return;
    if (props.viewerState.mode === "unregistered") {
      setError("フォローするには先にユーザー登録をしてください。");
      return;
    }
    if (props.viewerState.isOwner || !summary) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/creators/${encodeURIComponent(props.username)}/follow`,
        {
          method: summary.viewer.follows ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: props.viewerAddress }),
        }
      );
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorCode =
          isRecord(json) && typeof json.error === "string" ? json.error : "";
        throw new Error(errorCode);
      }
      setSummary(parseFollowSummary(json));
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mapActionError(mutationError.message)
          : "フォローの更新に失敗しました。"
      );
    } finally {
      setPending(false);
    }
  }

  const actionButton = (() => {
    if (props.viewerState.isOwner) {
      return (
        <Link
          href={props.managementHref}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-800 transition hover:border-gray-400"
        >
          投稿管理へ
        </Link>
      );
    }

    if (props.viewerState.mode === "unregistered") {
      return (
        <Link
          href={props.registrationHref}
          className="btn"
        >
          登録してフォロー
        </Link>
      );
    }

    if (props.viewerState.mode === "unconnected") {
      return (
        <button
          type="button"
          onClick={props.onRequireConnection}
          className="btn"
        >
          接続してフォロー
        </button>
      );
    }

    if (props.viewerState.mode === "loading") {
      return (
        <button
          type="button"
          disabled
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-500"
        >
          判定中...
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void handleToggleFollow()}
        disabled={pending || loading || !summary}
        className={`px-4 py-2 text-xs font-semibold transition ${
          summary?.viewer.follows
            ? "btn-secondary"
            : "btn"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending
          ? "更新中..."
          : summary?.viewer.follows
          ? "フォロー中"
          : "フォローする"}
      </button>
    );
  })();

  return (
    <div id="community" className="space-y-2">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div>
            <div className="text-[11px] text-[var(--text-subtle)]">フォロワー</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
              {loading ? "-" : countLabel(summary?.counts.followers ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-subtle)]">フォロー中</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
              {loading ? "-" : countLabel(summary?.counts.following ?? 0)}
            </div>
          </div>
        </div>
        {actionButton}
      </div>

      {error ? (
        <div className="text-xs text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
