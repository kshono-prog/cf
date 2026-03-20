"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { Avatar } from "@/components/shared/Avatar";
import {
  CommunityGuideCard,
  CommunityGuideLoadingCard,
} from "@/components/social/CommunityGuideCard";
import { SupportProjectSummaryCard } from "@/components/support/SupportProjectSummaryCard";
import type { FeedPost } from "@/components/feed/feedTypes";
import {
  resolveCommunityViewerLinks,
  resolveCommunityViewerMode,
} from "@/lib/communityUiState";
import type { DiscoverCreator } from "@/lib/discoverCreators";
import { parsePublicViewerMeResponse } from "@/lib/publicViewerState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function buildPostPreview(body: string): string {
  return body.length > 120 ? `${body.slice(0, 119)}…` : body;
}

function formatSupportAmount(
  value: number | null,
  currency: "JPYC" | "USDC"
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return `0 ${currency}`;
  }

  if (currency === "USDC") {
    return `${value.toLocaleString("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;
  }

  return `${Math.floor(value).toLocaleString("ja-JP")} JPYC`;
}

type SearchPageClientProps = {
  username: string;
  initialCreators: DiscoverCreator[];
  initialPosts: FeedPost[];
};

export function SearchPageClient(props: SearchPageClientProps) {
  const { address, isConnected } = useAccount();
  const [query, setQuery] = useState("");
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [creators] = useState<DiscoverCreator[]>(props.initialCreators);
  const [posts] = useState<FeedPost[]>(props.initialPosts);
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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCreators = useMemo(() => {
    if (!normalizedQuery) return creators;

    return creators.filter((creator) => {
      const matchesRecruitingProject = creator.recruitingProjects.some((project) => {
        return (
          matchesQuery(project.title, normalizedQuery) ||
          matchesQuery(project.description ?? "", normalizedQuery) ||
          matchesQuery(
            formatSupportAmount(project.targetAmount, project.currency),
            normalizedQuery
          )
        );
      });

      return (
        matchesQuery(creator.displayName, normalizedQuery) ||
        matchesQuery(creator.username, normalizedQuery) ||
        matchesQuery(creator.profile ?? "", normalizedQuery) ||
        matchesRecruitingProject
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

  const filteredSupportProjects = useMemo(() => {
    const supportSource = normalizedQuery ? creators : filteredCreators;

    return supportSource.flatMap((creator) =>
      creator.recruitingProjects
        .filter((project) => {
          if (!normalizedQuery) return true;

          return (
            matchesQuery(creator.displayName, normalizedQuery) ||
            matchesQuery(creator.username, normalizedQuery) ||
            matchesQuery(creator.profile ?? "", normalizedQuery) ||
            matchesQuery(project.title, normalizedQuery) ||
            matchesQuery(project.description ?? "", normalizedQuery) ||
            matchesQuery(
              formatSupportAmount(project.targetAmount, project.currency),
              normalizedQuery
            )
          );
        })
        .map((project) => ({ creator, project }))
    );
  }, [creators, filteredCreators, normalizedQuery]);

  const viewerMode = resolveCommunityViewerMode({
    isConnected,
    viewerAddress: address,
    identityResolved: viewerIdentityResolved,
    identity: viewerIdentity,
  });
  const { settingsHref, composeHref, notificationsHref } = resolveCommunityViewerLinks({
    fallbackUsername: props.username,
    identity: viewerIdentity,
  });

  const searchGuide = (() => {
    if (viewerMode === "loading") {
      return (
        <CommunityGuideLoadingCard
          title="使える機能を確認しています"
          body="接続状態と登録状況を読み込み中です。"
        />
      );
    }

    if (viewerMode === "unconnected") {
      return null;
    }

    if (viewerMode === "unregistered") {
      return (
        <CommunityGuideCard
          title="検索しながら、次はユーザー登録"
          body="検索と閲覧はそのまま使えます。投稿や自分のページ準備を始めたいときは、まずユーザー登録へ進みます。"
          actions={
            <>
              <Link href={settingsHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
            </>
          }
        />
      );
    }

    if (viewerMode === "userOnly") {
      return null;
    }

    return (
      <CommunityGuideCard
        title="検索しながら、そのまま行動できます"
        body="気になる人や投稿を探しながら、自分の投稿画面や通知にもすぐ移動できます。"
        actions={
          <>
            <Link href={composeHref} className="btn">
              投稿する
            </Link>
            <Link href={notificationsHref} className="btn-secondary">
              通知を見る
            </Link>
          </>
        }
      />
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

          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[var(--text)]">
                  みんなの応援してほしいこと
                </div>
                <p className="mt-1 text-sm text-[var(--text-subtle)]">
                  いま応援を求めている内容を、そのまま見比べられます。
                </p>
              </div>
              <div className="text-sm text-[var(--text-subtle)]">
                {filteredSupportProjects.length} 件
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {filteredSupportProjects.length === 0 ? (
                <div className="text-sm text-[var(--text-subtle)]">
                  見つかりませんでした。
                </div>
              ) : (
                filteredSupportProjects.map(({ creator, project }) => {
                  return (
                    <SupportProjectSummaryCard
                      key={`${creator.username}-${project.projectId}`}
                      creator={{
                        username: creator.username,
                        displayName: creator.displayName,
                        avatarUrl: creator.avatarUrl,
                        href: `/${creator.username}`,
                      }}
                      project={project}
                      actionLabel="応援する"
                      actionHref={`/${creator.username}?projectId=${encodeURIComponent(
                        project.projectId
                      )}&support=1`}
                    />
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
