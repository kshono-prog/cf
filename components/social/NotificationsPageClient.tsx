"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { Avatar } from "@/components/shared/Avatar";
import { usePublicViewerIdentity } from "@/components/shared/usePublicViewerIdentity";
import {
  CommunityGuideCard,
  CommunityGuideLoadingCard,
} from "@/components/social/CommunityGuideCard";
import {
  parseNotificationsResponse,
  type NotificationItem,
  type NotificationKind,
} from "@/lib/communityApiParsers";
import {
  resolveCommunityViewerLinks,
} from "@/lib/communityUiState";
import {
  formatNotificationTimestamp,
  getNotificationFallbackBadge,
} from "@/lib/notificationUi";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

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
  const { viewerIdentity, viewerIdentityResolved, viewerMode } =
    usePublicViewerIdentity({
      pageUsername: username,
      viewerAddress: address ?? null,
      isConnected,
    });

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
        const response = await ownerAuthFetch({
          address: connectedAddress,
          url: `/api/notifications?address=${encodeURIComponent(connectedAddress)}`,
          init: {
            method: "GET",
            cache: "no-store",
          },
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("FETCH_FAILED");
        }

        if (!cancelled) {
          setItems(parseNotificationsResponse(json));
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

  const { settingsHref, composeHref } = resolveCommunityViewerLinks({
    fallbackUsername: username,
    identity: viewerIdentity,
  });

  return (
    <div className="space-y-4">
      {viewerMode === "unconnected" ? (
        <CommunityGuideCard
          title="通知を見る前にウォレット接続"
          body="通知は、右上のウォレットから接続したあとに確認できます。接続すると、自分への反応や応援をここでまとめて見られます。"
          centered
          maxWidthClassName="max-w-lg"
          actions={
            <>
              <Link href={`/${username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
              <Link href={`/${username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </>
          }
        />
      ) : viewerMode === "loading" ? (
        <CommunityGuideLoadingCard
          title="使える機能を確認しています"
          centered
          maxWidthClassName="max-w-lg"
        />
      ) : viewerMode === "unregistered" ? (
        <CommunityGuideCard
          title="通知を見るには、まずユーザー登録"
          body="いまはウォレット接続まで完了しています。次はユーザー登録をすると、自分のページ準備や投稿の入口が使えるようになります。"
          centered
          maxWidthClassName="max-w-lg"
          actions={
            <>
              <Link href={settingsHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </>
          }
        />
      ) : viewerMode === "userOnly" ? (
        <CommunityGuideCard
          title="通知を受け取るには、公開ページの準備が必要です"
          body="返信や応援の通知は、公開ページを使い始めると確認できるようになります。次は設定から公開ページの準備へ進めます。"
          centered
          maxWidthClassName="max-w-lg"
          actions={
            <>
              <Link href={settingsHref} className="btn">
                設定を開く
              </Link>
              <Link href={composeHref} className="btn-secondary">
                投稿の準備を見る
              </Link>
            </>
          }
        />
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
            <div className="surface-subtle flex items-center gap-3 px-4 py-4 text-sm text-[var(--text-subtle)]">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]"
                aria-hidden="true"
              />
              通知を読み込み中です
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
                {filteredItems.map((item) => {
                  const fallbackBadge = getNotificationFallbackBadge(item.kind);
                  return (
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
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold ${fallbackBadge.className}`}
                          aria-label={fallbackBadge.title}
                          title={fallbackBadge.title}
                        >
                          {fallbackBadge.label}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-[var(--text)]">
                            {item.title}
                          </span>
                          <span className="text-[var(--text-subtle)]">
                            {formatNotificationTimestamp(item.createdAt)}
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
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
