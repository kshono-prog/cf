"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { Avatar } from "@/components/shared/Avatar";
import { parsePublicViewerMeResponse } from "@/lib/publicViewerState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";

type NotificationKind = "REPLY" | "LIKE" | "SUPPORT" | "NOTICE";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  href: string;
  title: string;
  body: string;
  actor:
    | {
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }
    | null;
  meta: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseItems(value: unknown): NotificationItem[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.items)) {
    return [];
  }

  return value.items
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const id = toStringOrNull(item.id);
      const kind = toStringOrNull(item.kind);
      const createdAt = toStringOrNull(item.createdAt);
      const href = toStringOrNull(item.href);
      const title = toStringOrNull(item.title);
      const body = toStringOrNull(item.body);
      const meta = item.meta === null ? null : toStringOrNull(item.meta);
      const actor = item.actor;

      if (
        !id ||
        !createdAt ||
        !href ||
        !title ||
        body === null ||
        meta === undefined ||
        (kind !== "REPLY" &&
          kind !== "LIKE" &&
          kind !== "SUPPORT" &&
          kind !== "NOTICE")
      ) {
        return null;
      }

      let parsedActor: NotificationItem["actor"] = null;
      if (actor !== null) {
        if (!isRecord(actor)) return null;
        const username = toStringOrNull(actor.username);
        const displayName = toStringOrNull(actor.displayName);
        const avatarUrl =
          actor.avatarUrl === null ? null : toStringOrNull(actor.avatarUrl);

        if (!username || !displayName || avatarUrl === undefined) {
          return null;
        }

        parsedActor = {
          username,
          displayName,
          avatarUrl,
        };
      }

      return {
        id,
        kind,
        createdAt,
        href,
        title,
        body,
        actor: parsedActor,
        meta,
      };
    })
    .filter((item): item is NotificationItem => item !== null);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type FilterKey = "ALL" | NotificationKind;

const FILTER_LABELS: Record<FilterKey, string> = {
  ALL: "すべて",
  REPLY: "返信",
  LIKE: "いいね",
  SUPPORT: "応援",
  NOTICE: "お知らせ",
};

export function NotificationsPageClient({ username }: { username: string }) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);

  useEffect(() => {
    if (!address || !isConnected) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function loadViewer() {
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

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  useEffect(() => {
    if (!address || !isConnected || !viewerIdentityResolved || !viewerIdentity?.hasCreator) {
      setItems([]);
      setLoading(false);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/notifications?address=${encodeURIComponent(connectedAddress)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("FETCH_FAILED");
        }

        if (!cancelled) {
          setItems(parseItems(json));
        }
      } catch {
        if (!cancelled) {
          setError("うまく読み込めませんでした。もう一度お試しください。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, viewerIdentity, viewerIdentityResolved]);

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  async function handleConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  const viewerMode = (() => {
    if (!isConnected || !address) return "unconnected" as const;
    if (!viewerIdentityResolved) return "loading" as const;
    if (!viewerIdentity?.hasUser) return "unregistered" as const;
    if (!viewerIdentity.hasCreator) return "userOnly" as const;
    return "creatorReady" as const;
  })();

  const settingsHref = viewerIdentity?.creatorUsername
    ? `/${viewerIdentity.creatorUsername}/mypage`
    : viewerIdentity?.user?.username
    ? `/${viewerIdentity.user.username}/mypage`
    : `/${username}/mypage`;
  const composeHref = viewerIdentity?.creatorUsername
    ? `/${viewerIdentity.creatorUsername}/compose`
    : settingsHref;
  const compactGuideClass = "surface-subtle px-4 py-4 sm:px-5";
  const compactGuideTitleClass = "text-sm font-semibold text-[var(--text)]";
  const compactGuideBodyClass = "mt-1 text-xs leading-6 text-[var(--text-subtle)]";

  return (
    <div className="space-y-4">
      {viewerMode === "unconnected" ? (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-lg text-center">
            <h2 className={compactGuideTitleClass}>
              通知を見るにはウォレット接続が必要です
            </h2>
            <p className={compactGuideBodyClass}>
              接続すると、自分への反応や応援をここでまとめて確認できます。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn" onClick={() => void handleConnect()}>
                ウォレット接続
              </button>
              <Link href={`/${username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
            </div>
          </div>
        </section>
      ) : viewerMode === "loading" ? (
        <div className={`${compactGuideClass} text-xs text-[var(--text-subtle)]`}>
          使える機能を確認しています
        </div>
      ) : viewerMode === "unregistered" ? (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-lg text-center">
            <h2 className={compactGuideTitleClass}>
              通知を見るには、まずユーザー登録
            </h2>
            <p className={compactGuideBodyClass}>
              いまはウォレット接続まで完了しています。次はユーザー登録をすると、自分のページ準備や投稿の入口が使えるようになります。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href={settingsHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </div>
          </div>
        </section>
      ) : viewerMode === "userOnly" ? (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-lg text-center">
            <h2 className={compactGuideTitleClass}>
              通知を受け取るには、公開ページの準備が必要です
            </h2>
            <p className={compactGuideBodyClass}>
              返信や応援の通知は、公開ページを使い始めると確認できるようになります。次は設定から公開ページの準備へ進めます。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href={settingsHref} className="btn">
                設定を開く
              </Link>
              <Link href={composeHref} className="btn-secondary">
                投稿の準備を見る
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="surface-card p-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`chip-button ${
                    filter === key ? "border-slate-900 bg-slate-900 text-white" : ""
                  }`}
                  onClick={() => setFilter(key)}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
            </div>
          </section>

          {loading ? (
            <div className="surface-card p-5 text-sm text-[var(--text-subtle)]">
              読み込み中です
            </div>
          ) : error ? (
            <div className="alert-warn">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="surface-card p-5 text-sm text-[var(--text-subtle)]">
              まだ通知はありません。
            </div>
          ) : (
            <section className="surface-card p-5 sm:p-6">
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="surface-subtle flex gap-3 px-4 py-4 transition hover:bg-white"
                  >
                    {item.actor ? (
                      <Avatar
                        src={item.actor.avatarUrl}
                        alt={`${item.actor.displayName} のアイコン`}
                        fallbackText={item.actor.displayName.slice(0, 1)}
                        size={44}
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-sm font-semibold text-[var(--text-subtle)]">
                        応
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-[var(--text)]">
                          {item.title}
                        </span>
                        <span className="text-[var(--text-subtle)]">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      {item.actor ? (
                        <div className="mt-1 text-xs text-[var(--text-subtle)]">
                          {item.actor.displayName} @{item.actor.username}
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-[var(--text)]">
                        {item.body}
                      </p>
                      {item.meta ? (
                        <div className="mt-2 text-xs text-[var(--text-subtle)]">
                          {item.meta}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
