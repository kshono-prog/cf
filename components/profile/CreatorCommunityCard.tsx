"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useOwnerSession } from "@/context/OwnerSessionProvider";
import {
  parseFollowSummaryResponse,
  type FollowSummary,
} from "@/lib/communityApiParsers";
import { isRecord } from "@/lib/api/guards";
import {
  getAppAuthenticationHint,
  mapFollowActionError,
} from "@/lib/communityUiState";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { PublicViewerState } from "@/lib/publicViewerState";

type Props = {
  username: string;
  viewerAddress: string | null;
  viewerState: PublicViewerState;
  managementHref: string;
  registrationHref: string;
};

function countLabel(value: number): string {
  return value.toLocaleString("ja-JP");
}

export function CreatorCommunityCard(props: Props) {
  const ownerSession = useOwnerSession();
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
      setSummary(parseFollowSummaryResponse(json));
    } catch {
      setError("フォロワー情報を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, [props.username, query]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const scheduleFetch = () => {
      void fetchSummary();
    };

    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      idleId = window.requestIdleCallback(scheduleFetch, { timeout: 2000 });
    } else {
      timeoutId = globalThis.setTimeout(scheduleFetch, 500);
    }

    return () => {
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [fetchSummary]);

  async function handleToggleFollow(): Promise<void> {
    if (!props.viewerAddress) return;
    if (props.viewerState.mode === "loading") return;
    if (props.viewerState.mode === "unregistered") {
      setError("フォローするには先にユーザー登録をしてください。");
      return;
    }
    if (props.viewerState.isOwner || !summary) return;

    setPending(true);
    setError(null);

    try {
      const response = await ownerAuthFetch({
        address: props.viewerAddress,
        url: `/api/creators/${encodeURIComponent(props.username)}/follow`,
        init: {
          method: summary.viewer.follows ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: props.viewerAddress }),
        },
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorCode =
          isRecord(json) && typeof json.error === "string" ? json.error : "";
        throw new Error(errorCode);
      }
      setSummary(parseFollowSummaryResponse(json));
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mapFollowActionError(mutationError.message)
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
          className="btn-secondary text-xs"
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
      return null;
    }

    if (props.viewerState.mode === "loading") {
      return (
        <button
          type="button"
          disabled
          className="btn-secondary text-xs text-[var(--text-subtle)]"
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
          <Link
            href={`/${props.username}/follows?tab=followers`}
            className="rounded-2xl px-2 py-1 transition hover:bg-[var(--surface-subtle)]"
          >
            <div className="text-[11px] text-[var(--text-subtle)]">フォロワー</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
              {loading ? "-" : countLabel(summary?.counts.followers ?? 0)}
            </div>
          </Link>
          <Link
            href={`/${props.username}/follows?tab=following`}
            className="rounded-2xl px-2 py-1 transition hover:bg-[var(--surface-subtle)]"
          >
            <div className="text-[11px] text-[var(--text-subtle)]">フォロー中</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
              {loading ? "-" : countLabel(summary?.counts.following ?? 0)}
            </div>
          </Link>
      </div>
        {actionButton}
      </div>

      {props.viewerState.mode === "unconnected" ? (
        <div className="text-xs leading-5 text-[var(--text-subtle)]">
          フォローするには、右上のウォレットから接続してください。
        </div>
      ) : null}

      {props.viewerState.mode === "registered" &&
      ownerSession.status === "checking" ? (
        <div className="text-xs leading-5 text-[var(--text-subtle)]">
          アプリ認証の状態を確認しています。
        </div>
      ) : null}

      {props.viewerState.mode === "registered" &&
      ownerSession.status === "unauthenticated" ? (
        <div className="text-xs leading-5 text-[var(--text-subtle)]">
          {getAppAuthenticationHint("フォロー")}
        </div>
      ) : null}

      {error ? (
        <div className="text-xs text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
