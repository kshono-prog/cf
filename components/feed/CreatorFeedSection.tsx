"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { ReplyComposer } from "@/components/feed/ReplyComposer";
import { ReplyList } from "@/components/feed/ReplyList";
import {
  parseApiErrorCode,
  parseFeedLikeToggleResponse,
  parseFeedListResponse,
  parseFeedPostDetailResponse,
  parseFeedReplyCreateResponse,
  toSelectedPostTipContext,
  type FeedPost,
  type FeedReply,
  type SelectedPostTipContext,
} from "@/components/feed/feedTypes";

type CurrencyProjectIds = {
  JPYC: string | null;
  USDC: string | null;
};

type PostDetailState = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  post: FeedPost | null;
  replies: FeedReply[];
  replyInput: string;
  replying: boolean;
  pendingReplyLikeIds: Set<string>;
};

type Props = {
  creatorUsername: string | null;
  viewerAddress: string | null;
  selectedPostId: string | null;
  projectIdsByCurrency: CurrencyProjectIds;
  showTipAction?: boolean;
  refreshToken: number;
  headerColor: string;
  onSelectTipPost: (post: SelectedPostTipContext) => void;
  onFocusWalletSection: () => void;
};

function createEmptyDetailState(): PostDetailState {
  return {
    loading: false,
    loaded: false,
    error: null,
    post: null,
    replies: [],
    replyInput: "",
    replying: false,
    pendingReplyLikeIds: new Set<string>(),
  };
}

function buildFeedActionErrorMessage(
  code: string | null,
  fallback: string
): string {
  switch (code) {
    case "ADDRESS_REQUIRED":
      return "続けるにはウォレットを接続してください。";
    case "CREATOR_NOT_FOUND":
      return "現在はクリエイター登録済みウォレットでのみ利用できます。";
    case "POST_NOT_FOUND":
    case "REPLY_NOT_FOUND":
      return "投稿情報を読み直してください。";
    case "BODY_REQUIRED":
      return "返信内容を入力してください。";
    case "BODY_TOO_LONG":
      return "返信は短めにまとめてください。";
    default:
      return fallback;
  }
}

function isTipSupported(post: FeedPost, projectIdsByCurrency: CurrencyProjectIds) {
  if (post.project?.currency === "JPYC") return projectIdsByCurrency.JPYC !== null;
  if (post.project?.currency === "USDC") return projectIdsByCurrency.USDC !== null;
  return projectIdsByCurrency.JPYC !== null || projectIdsByCurrency.USDC !== null;
}

export function CreatorFeedSection(props: Props) {
  const {
    creatorUsername,
    viewerAddress,
    selectedPostId,
    projectIdsByCurrency,
    showTipAction = true,
    refreshToken,
    headerColor,
    onSelectTipPost,
    onFocusWalletSection,
  } = props;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [detailByPostId, setDetailByPostId] = useState<Record<string, PostDetailState>>(
    {}
  );
  const [openPostIds, setOpenPostIds] = useState<Record<string, boolean>>({});
  const [pendingPostLikeIds, setPendingPostLikeIds] = useState<Set<string>>(
    new Set<string>()
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const viewerQuery = useMemo(
    () =>
      viewerAddress ? `&viewerAddress=${encodeURIComponent(viewerAddress)}` : "",
    [viewerAddress]
  );

  function ensureDetailState(postId: string) {
    setDetailByPostId((current) => {
      if (current[postId]) return current;
      return {
        ...current,
        [postId]: createEmptyDetailState(),
      };
    });
  }

  async function readJsonSafe(response: Response): Promise<unknown> {
    return response.json().catch(() => null);
  }

  const fetchFeedPage = useCallback(
    async (params: { cursor?: string | null; append: boolean }): Promise<void> => {
      const creatorFilter =
        creatorUsername && creatorUsername.length > 0
          ? `creatorUsername=${encodeURIComponent(creatorUsername)}`
          : "";
      const cursorQuery = params.cursor
        ? `&cursor=${encodeURIComponent(params.cursor)}`
        : "";
      const url = `/api/feed?${creatorFilter}${viewerQuery}${cursorQuery}`;

      if (params.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
        });
        const json = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(parseApiErrorCode(json) ?? "FEED_FETCH_FAILED");
        }

        const parsed = parseFeedListResponse(json);
        setPosts((current) =>
          params.append ? [...current, ...parsed.items] : parsed.items
        );
        setNextCursor(parsed.nextCursor);
      } catch {
        if (params.append) {
          setNotice("投稿の続きを読み込めませんでした。");
        } else {
          setError("投稿を読み込めませんでした。");
        }
      } finally {
        if (params.append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [creatorUsername, viewerQuery]
  );

  const fetchPostDetail = useCallback(
    async (postId: string): Promise<void> => {
      ensureDetailState(postId);
      setDetailByPostId((current) => ({
        ...current,
        [postId]: {
          ...(current[postId] ?? createEmptyDetailState()),
          loading: true,
          error: null,
        },
      }));

      try {
        const response = await fetch(
          `/api/posts/${encodeURIComponent(postId)}?replyLimit=20${viewerQuery}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(parseApiErrorCode(json) ?? "POST_DETAIL_FETCH_FAILED");
        }

        const parsed = parseFeedPostDetailResponse(json);

        setPosts((current) =>
          current.map((post) => (post.id === parsed.post.id ? parsed.post : post))
        );
        setDetailByPostId((current) => ({
          ...current,
          [postId]: {
            ...(current[postId] ?? createEmptyDetailState()),
            loading: false,
            loaded: true,
            error: null,
            post: parsed.post,
            replies: parsed.replies,
          },
        }));
      } catch {
        setDetailByPostId((current) => ({
          ...current,
          [postId]: {
            ...(current[postId] ?? createEmptyDetailState()),
            loading: false,
            loaded: false,
            error: "返信を読み込めませんでした。",
          },
        }));
      }
    },
    [viewerQuery]
  );

  useEffect(() => {
    void fetchFeedPage({ append: false });
    setNotice(null);
  }, [fetchFeedPage, refreshToken]);

  useEffect(() => {
    const openIds = Object.entries(openPostIds)
      .filter(([, isOpen]) => isOpen)
      .map(([postId]) => postId);

    for (const postId of openIds) {
      void fetchPostDetail(postId);
    }
  }, [fetchPostDetail, openPostIds, refreshToken]);

  function updatePostInAllStates(postId: string, updater: (post: FeedPost) => FeedPost) {
    setPosts((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
    setDetailByPostId((current) => {
      const detail = current[postId];
      if (!detail?.post) return current;
      return {
        ...current,
        [postId]: {
          ...detail,
          post: updater(detail.post),
        },
      };
    });
  }

  function handleNeedConnection() {
    setNotice("いいねや返信を続けるには、まずウォレットを接続してください。");
    onFocusWalletSection();
  }

  async function handleShare(post: FeedPost): Promise<void> {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/${post.creator.username}#posts`
        : `/${post.creator.username}#posts`;
    const shareTitle = `${post.creator.displayName}の投稿を共有`;

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: shareTitle,
          text: post.body.slice(0, 80),
          url: shareUrl,
        });
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        setNotice("共有リンクをコピーしました。");
        return;
      }

      setNotice("共有リンクを用意できませんでした。");
    } catch {
      setNotice("共有を完了できませんでした。もう一度お試しください。");
    }
  }

  async function handleTogglePostLike(post: FeedPost): Promise<void> {
    if (!viewerAddress) {
      handleNeedConnection();
      return;
    }

    setPendingPostLikeIds((current) => new Set<string>(current).add(post.id));

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/like`, {
        method: post.viewerHasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: viewerAddress }),
      });
      const json = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          buildFeedActionErrorMessage(
            parseApiErrorCode(json),
            "いいねの更新に失敗しました。"
          )
        );
      }

      const parsed = parseFeedLikeToggleResponse(json);
      updatePostInAllStates(post.id, (currentPost) => ({
        ...currentPost,
        counts: {
          ...currentPost.counts,
          likes: parsed.likeCount,
        },
        viewerHasLiked: parsed.liked,
      }));
      setNotice(null);
    } catch (mutationError) {
      setNotice(
        mutationError instanceof Error
          ? mutationError.message
          : "いいねの更新に失敗しました。"
      );
    } finally {
      setPendingPostLikeIds((current) => {
        const next = new Set<string>(current);
        next.delete(post.id);
        return next;
      });
    }
  }

  async function handleToggleReplyLike(postId: string, reply: FeedReply): Promise<void> {
    if (!viewerAddress) {
      handleNeedConnection();
      return;
    }

    setDetailByPostId((current) => {
      const detail = current[postId] ?? createEmptyDetailState();
      const nextPending = new Set<string>(detail.pendingReplyLikeIds);
      nextPending.add(reply.id);
      return {
        ...current,
        [postId]: {
          ...detail,
          pendingReplyLikeIds: nextPending,
        },
      };
    });

    try {
      const response = await fetch(
        `/api/replies/${encodeURIComponent(reply.id)}/like`,
        {
          method: reply.viewerHasLiked ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: viewerAddress }),
        }
      );
      const json = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          buildFeedActionErrorMessage(
            parseApiErrorCode(json),
            "返信のいいね更新に失敗しました。"
          )
        );
      }

      const parsed = parseFeedLikeToggleResponse(json);
      setDetailByPostId((current) => {
        const detail = current[postId];
        if (!detail) return current;
        return {
          ...current,
          [postId]: {
            ...detail,
            replies: detail.replies.map((currentReply) =>
              currentReply.id === reply.id
                ? {
                    ...currentReply,
                    likeCount: parsed.likeCount,
                    viewerHasLiked: parsed.liked,
                  }
                : currentReply
            ),
          },
        };
      });
      setNotice(null);
    } catch (mutationError) {
      setNotice(
        mutationError instanceof Error
          ? mutationError.message
          : "返信のいいね更新に失敗しました。"
      );
    } finally {
      setDetailByPostId((current) => {
        const detail = current[postId];
        if (!detail) return current;
        const nextPending = new Set<string>(detail.pendingReplyLikeIds);
        nextPending.delete(reply.id);
        return {
          ...current,
          [postId]: {
            ...detail,
            pendingReplyLikeIds: nextPending,
          },
        };
      });
    }
  }

  async function handleSubmitReply(postId: string): Promise<void> {
    if (!viewerAddress) {
      handleNeedConnection();
      return;
    }

    const detail = detailByPostId[postId] ?? createEmptyDetailState();
    const body = detail.replyInput.trim();
    if (!body) {
      setNotice("返信内容を入力してください。");
      return;
    }

    setDetailByPostId((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] ?? createEmptyDetailState()),
        replying: true,
      },
    }));

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: viewerAddress,
            body,
          }),
        }
      );
      const json = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          buildFeedActionErrorMessage(
            parseApiErrorCode(json),
            "返信の送信に失敗しました。"
          )
        );
      }

      const parsed = parseFeedReplyCreateResponse(json);
      setDetailByPostId((current) => ({
        ...current,
        [postId]: {
          ...(current[postId] ?? createEmptyDetailState()),
          loading: false,
          loaded: true,
          error: null,
          post: current[postId]?.post ?? null,
          replies: [...(current[postId]?.replies ?? []), parsed.reply],
          replyInput: "",
          replying: false,
          pendingReplyLikeIds:
            current[postId]?.pendingReplyLikeIds ?? new Set<string>(),
        },
      }));
      updatePostInAllStates(postId, (currentPost) => ({
        ...currentPost,
        counts: {
          ...currentPost.counts,
          replies: parsed.postReplyCount,
        },
      }));
      setNotice("返信を送信しました。");
    } catch (mutationError) {
      setDetailByPostId((current) => ({
        ...current,
        [postId]: {
          ...(current[postId] ?? createEmptyDetailState()),
          replying: false,
        },
      }));
      setNotice(
        mutationError instanceof Error
          ? mutationError.message
          : "返信の送信に失敗しました。"
      );
    }
  }

  function handleReplyInputChange(postId: string, nextValue: string) {
    setDetailByPostId((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] ?? createEmptyDetailState()),
        replyInput: nextValue,
      },
    }));
  }

  function handleToggleReplies(postId: string) {
    const nextOpen = !openPostIds[postId];
    setOpenPostIds((current) => ({
      ...current,
      [postId]: nextOpen,
    }));

    if (nextOpen) {
      const detail = detailByPostId[postId];
      if (!detail?.loaded && !detail?.loading) {
        void fetchPostDetail(postId);
      }
    }
  }

  function handleSelectTip(post: FeedPost) {
    if (!isTipSupported(post, projectIdsByCurrency)) {
      setNotice("この投稿に使える支援先プロジェクトがまだ準備されていません。");
      return;
    }

    onSelectTipPost(toSelectedPostTipContext(post));
    setNotice("応援する投稿を選びました。応援シートから続けられます。");
    onFocusWalletSection();
  }

  return (
    <section className="mt-6 rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
            {creatorUsername ? "投稿" : "最新の投稿"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {creatorUsername
              ? "近況への返信やいいね、そのまま投稿への応援まで自然に続けられます。"
              : "いま公開されている最新の投稿を一覧で見られます。応援は各プロフィールから続けられます。"}
          </p>
        </div>
        <div
          className="h-1.5 w-20 rounded-full"
          style={{ backgroundColor: headerColor }}
        />
      </div>

      {notice ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          投稿を読み込み中です…
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
          投稿の読み込みに失敗しました: {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          まだ公開されている投稿はありません。
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {posts.map((post) => {
            const detail = detailByPostId[post.id] ?? createEmptyDetailState();
            const cardPost = detail.post ?? post;
            const isOpen = openPostIds[post.id] === true;

            return (
              <FeedPostCard
                key={post.id}
                post={cardPost}
                selectedForTip={selectedPostId === post.id}
                canTip={isTipSupported(cardPost, projectIdsByCurrency)}
                showTipAction={showTipAction}
                liking={pendingPostLikeIds.has(post.id)}
                repliesOpen={isOpen}
                detailLoading={detail.loading}
                onToggleLike={() => {
                  void handleTogglePostLike(cardPost);
                }}
                onToggleReplies={() => {
                  handleToggleReplies(post.id);
                }}
                onShare={() => {
                  void handleShare(cardPost);
                }}
                onTip={() => {
                  handleSelectTip(cardPost);
                }}
              >
                {isOpen ? (
                  <div className="space-y-4">
                    {detail.loading ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        返信を読み込み中です…
                      </div>
                    ) : detail.error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
                        返信の読み込みに失敗しました: {detail.error}
                      </div>
                    ) : (
                      <>
                        <ReplyList
                          replies={detail.replies}
                          pendingReplyLikeIds={detail.pendingReplyLikeIds}
                          onToggleLike={(reply) => {
                            void handleToggleReplyLike(post.id, reply);
                          }}
                        />
                        <ReplyComposer
                          value={detail.replyInput}
                          disabled={!viewerAddress}
                          submitting={detail.replying}
                          onChange={(nextValue) => {
                            handleReplyInputChange(post.id, nextValue);
                          }}
                          onSubmit={() => {
                            void handleSubmitReply(post.id);
                          }}
                        />
                      </>
                    )}
                  </div>
                ) : null}
              </FeedPostCard>
            );
          })}
        </div>
      )}

      {nextCursor ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              void fetchFeedPage({ cursor: nextCursor, append: true });
            }}
            disabled={loadingMore}
          >
            {loadingMore ? "読み込み中…" : "もっと見る"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
