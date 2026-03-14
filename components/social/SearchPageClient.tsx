"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { Avatar } from "@/components/shared/Avatar";
import {
  parseFeedListResponse,
  type FeedPost,
} from "@/components/feed/feedTypes";
import { parsePublicViewerMeResponse } from "@/lib/publicViewerState";

type SearchCreator = {
  username: string;
  displayName: string;
  profile: string | null;
  avatarUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCreators(value: unknown): SearchCreator[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const username = typeof item.username === "string" ? item.username : null;
      const displayName =
        typeof item.displayName === "string" ? item.displayName : null;
      const profile =
        item.profile === null
          ? null
          : typeof item.profile === "string"
          ? item.profile
          : null;
      const avatarUrl =
        item.avatarUrl === null
          ? null
          : typeof item.avatarUrl === "string"
          ? item.avatarUrl
          : null;

      if (!username || !displayName) {
        return null;
      }

      return {
        username,
        displayName,
        profile,
        avatarUrl,
      };
    })
    .filter((item): item is SearchCreator => item !== null);
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function buildPostPreview(body: string): string {
  return body.length > 120 ? `${body.slice(0, 119)}…` : body;
}

type SearchPageClientProps = {
  username: string;
};

export function SearchPageClient(props: SearchPageClientProps) {
  const { address } = useAccount();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creators, setCreators] = useState<SearchCreator[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);

  useEffect(() => {
    if (!address) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function loadViewer() {
      setViewerIdentityResolved(false);
      try {
        const response = await fetch(
          `/api/me?address=${encodeURIComponent(connectedAddress)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);
        if (!cancelled) {
          setViewerIdentity(
            response.ok ? parsePublicViewerMeResponse(json) : null
          );
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
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [creatorResponse, feedResponse] = await Promise.all([
          fetch("/api/creators/random?limit=18", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/feed?limit=30", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const creatorsJson: unknown = await creatorResponse.json().catch(() => null);
        const feedJson: unknown = await feedResponse.json().catch(() => null);

        if (cancelled) return;

        if (!creatorResponse.ok || !feedResponse.ok) {
          throw new Error("FETCH_FAILED");
        }

        setCreators(parseCreators(creatorsJson));
        setPosts(parseFeedListResponse(feedJson).items);
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCreators = useMemo(() => {
    if (!normalizedQuery) return creators;

    return creators.filter((creator) => {
      return (
        matchesQuery(creator.displayName, normalizedQuery) ||
        matchesQuery(creator.username, normalizedQuery) ||
        matchesQuery(creator.profile ?? "", normalizedQuery)
      );
    });
  }, [creators, normalizedQuery]);

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      return (
        matchesQuery(post.body, normalizedQuery) ||
        matchesQuery(post.creator.displayName, normalizedQuery) ||
        matchesQuery(post.creator.username, normalizedQuery)
      );
    });
  }, [normalizedQuery, posts]);

  const viewerMode = (() => {
    if (!address) return "unconnected" as const;
    if (!viewerIdentityResolved) return "loading" as const;
    if (!viewerIdentity?.hasUser) return "unregistered" as const;
    if (!viewerIdentity.hasCreator) return "userOnly" as const;
    return "creatorReady" as const;
  })();

  const settingsHref = viewerIdentity?.creatorUsername
    ? `/${viewerIdentity.creatorUsername}/mypage`
    : viewerIdentity?.user?.username
    ? `/${viewerIdentity.user.username}/mypage`
    : `/${props.username}/mypage`;
  const composeHref = viewerIdentity?.creatorUsername
    ? `/${viewerIdentity.creatorUsername}/compose`
    : settingsHref;
  const notificationsHref = viewerIdentity?.creatorUsername
    ? `/${viewerIdentity.creatorUsername}/notifications`
    : settingsHref;
  const compactGuideClass = "surface-subtle px-4 py-4 sm:px-5";
  const compactGuideTitleClass = "text-sm font-semibold text-[var(--text)]";
  const compactGuideBodyClass = "mt-1 text-xs leading-6 text-[var(--text-subtle)]";

  const searchGuide = (() => {
    if (viewerMode === "loading") {
      return (
        <section className={compactGuideClass}>
          <div className={compactGuideTitleClass}>
            使える機能を確認しています
          </div>
          <p className={compactGuideBodyClass}>
            接続状態と登録状況を読み込み中です。
          </p>
        </section>
      );
    }

    if (viewerMode === "unconnected") {
      return null;
    }

    if (viewerMode === "unregistered") {
      return (
        <section className={compactGuideClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={compactGuideTitleClass}>
                検索しながら、次はユーザー登録
              </div>
              <p className={compactGuideBodyClass}>
                検索と閲覧はそのまま使えます。投稿や自分のページ準備を始めたいときは、まずユーザー登録へ進みます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={settingsHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (viewerMode === "userOnly") {
      return null;
    }

    return (
      <section className={compactGuideClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={compactGuideTitleClass}>
              検索しながら、そのまま行動できます
            </div>
            <p className={compactGuideBodyClass}>
              気になる人や投稿を探しながら、自分の投稿画面や通知にもすぐ移動できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={composeHref} className="btn">
              投稿する
            </Link>
            <Link href={notificationsHref} className="btn-secondary">
              通知を見る
            </Link>
          </div>
        </div>
      </section>
    );
  })();

  return (
    <div className="space-y-4">
      <section className="surface-card p-5 sm:p-6">
        <div className="text-lg font-semibold text-[var(--text)]">検索</div>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          人や投稿を探して、次に見たい流れをすぐ見つけられます。
        </p>
        <div className="mt-4">
          <input
            type="search"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前、ユーザー名、投稿内容で検索"
          />
        </div>
      </section>

      {searchGuide}

      {loading ? (
        <div className="surface-card p-5 text-sm text-[var(--text-subtle)]">
          読み込み中です
        </div>
      ) : error ? (
        <div className="alert-warn">{error}</div>
      ) : (
        <>
          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[var(--text)]">
                  おすすめの人
                </div>
                <p className="mt-1 text-sm text-[var(--text-subtle)]">
                  気になる活動をすぐ見つけられます。
                </p>
              </div>
              <div className="text-sm text-[var(--text-subtle)]">
                {filteredCreators.length} 件
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredCreators.length === 0 ? (
                <div className="text-sm text-[var(--text-subtle)]">
                  見つかりませんでした。
                </div>
              ) : (
                filteredCreators.map((creator) => (
                  <Link
                    key={creator.username}
                    href={`/${creator.username}`}
                    className="surface-subtle flex items-start gap-3 px-4 py-4 transition hover:bg-white"
                  >
                    <Avatar
                      src={creator.avatarUrl}
                      alt={`${creator.displayName} のアイコン`}
                      fallbackText={creator.displayName.slice(0, 1)}
                      size={48}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)]">
                        {creator.displayName}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-subtle)]">
                        @{creator.username}
                      </div>
                      {creator.profile ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-subtle)]">
                          {creator.profile}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[var(--text)]">
                  投稿
                </div>
                <p className="mt-1 text-sm text-[var(--text-subtle)]">
                  最近の流れから、気になる話題へそのまま移動できます。
                </p>
              </div>
              <div className="text-sm text-[var(--text-subtle)]">
                {filteredPosts.length} 件
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {filteredPosts.length === 0 ? (
                <div className="text-sm text-[var(--text-subtle)]">
                  見つかりませんでした。
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${post.creator.username}#posts`}
                    className="surface-subtle block px-4 py-4 transition hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm text-[var(--text-subtle)]">
                      <span className="font-semibold text-[var(--text)]">
                        {post.creator.displayName}
                      </span>
                      <span>@{post.creator.username}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--text)]">
                      {buildPostPreview(post.body)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
