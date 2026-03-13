"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/shared/Avatar";
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

function previewInitials(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 1).toUpperCase() || "?";
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
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
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
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
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
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          summary?.viewer.follows
            ? "border border-gray-300 bg-white text-gray-800 hover:border-gray-400"
            : "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
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
    <section
      id="community"
      className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Community
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
              つながりとフォロー
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              新着投稿を追いかけたい人はフォローできます。活動を見守っている人の輪もここで確認できます。
            </p>
          </div>
          {actionButton}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              フォロワー
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "-" : countLabel(summary?.counts.followers ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              最近つながってくれた人たち
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              フォロー中
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "-" : countLabel(summary?.counts.following ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              このクリエイターが追いかけている相手
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
            フォロワー一覧を読み込み中です...
          </div>
        ) : summary && summary.followers.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-600">
              最近のフォロワー
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summary.followers.map((follower) => (
                <Link
                  key={follower.id}
                  href={`/${follower.username}`}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 transition hover:border-gray-300"
                >
                  <Avatar
                    src={follower.avatarUrl}
                    alt={`${follower.displayName} のアイコン`}
                    fallbackText={previewInitials(follower.displayName)}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {follower.displayName}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      @{follower.username}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
            まだフォロワー表示はありません。最初の投稿や支援報告を続けると見つけてもらいやすくなります。
          </div>
        )}
      </div>
    </section>
  );
}
