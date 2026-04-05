"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { useOwnerSession } from "@/context/OwnerSessionProvider";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { ReplyComposer } from "@/components/feed/ReplyComposer";
import { ReplyList } from "@/components/feed/ReplyList";
import {
  parseApiErrorCode,
  parseFeedLikeToggleResponse,
  parseFeedReplyDeleteResponse,
  parseFeedListResponse,
  parseFeedPostDetailResponse,
  parseFeedReplyCreateResponse,
  parseFeedReplyUpdateResponse,
  toSelectedPostTipContext,
  type FeedPost,
  type FeedReply,
  type SelectedPostTipContext,
} from "@/components/feed/feedTypes";
import { mapCommunityProtectedActionError } from "@/lib/communityUiState";
import {
  deleteMyPostingPost,
  updateMyPostingPostContent,
} from "@/lib/mypage/postingApi";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

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

type PostEditDraft = {
  body: string;
  projectId: string;
  mediaType: "" | "IMAGE" | "VIDEO" | "LINK";
  mediaUrl: string;
};

type Props = {
  creatorUsername: string | null;
  viewerAddress: string | null;
  managedCreatorUsername?: string | null;
  managePostAddress?: Address | null;
  manageProjectOptions?: Array<{ id: string; label: string }>;
  selectedPostId: string | null;
  projectIdsByCurrency: CurrencyProjectIds;
  showTipAction?: boolean;
  refreshToken: number;
  initialFeed?: {
    items: FeedPost[];
    nextCursor: string | null;
  } | null;
  headerColor: string;
  goalAchievedAt?: string | null;
  onSelectTipPost: (post: SelectedPostTipContext) => void;
  onFocusWalletSection: () => void;
};

export type CreatorFeedSectionProps = Props;

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
    case "POST_NOT_FOUND":
    case "REPLY_NOT_FOUND":
      return "投稿情報を読み直してください。";
    case "BODY_REQUIRED":
      return "返信内容を入力してください。";
    case "BODY_TOO_LONG":
      return "返信は短めにまとめてください。";
    default:
      return mapCommunityProtectedActionError(code ?? "", fallback);
  }
}

function isTipSupported(post: FeedPost, projectIdsByCurrency: CurrencyProjectIds) {
  if (post.project?.currency === "JPYC") return projectIdsByCurrency.JPYC !== null;
  if (post.project?.currency === "USDC") return projectIdsByCurrency.USDC !== null;
  return projectIdsByCurrency.JPYC !== null || projectIdsByCurrency.USDC !== null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function createEditDraft(post: FeedPost): PostEditDraft {
  return {
    body: post.body,
    projectId: post.projectId ?? "",
    mediaType: post.mediaType ?? "",
    mediaUrl: post.mediaUrl ?? "",
  };
}

export function CreatorFeedSection(props: Props) {
  const ownerSession = useOwnerSession();
  const {
    creatorUsername,
    viewerAddress,
    managedCreatorUsername = null,
    managePostAddress = null,
    manageProjectOptions = [],
    selectedPostId,
    projectIdsByCurrency,
    showTipAction = true,
    refreshToken,
    initialFeed = null,
    headerColor,
    goalAchievedAt = null,
    onSelectTipPost,
    onFocusWalletSection,
  } = props;

  const goalAchievedAtMs = goalAchievedAt ? new Date(goalAchievedAt).getTime() : null;

  const [posts, setPosts] = useState<FeedPost[]>(() => initialFeed?.items ?? []);
  const [detailByPostId, setDetailByPostId] = useState<Record<string, PostDetailState>>(
    {}
  );
  const [openPostIds, setOpenPostIds] = useState<Record<string, boolean>>({});
  const [pendingPostLikeIds, setPendingPostLikeIds] = useState<Set<string>>(
    new Set<string>()
  );
  const [loading, setLoading] = useState(initialFeed === null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialFeed?.nextCursor ?? null
  );
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PostEditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyEditValue, setReplyEditValue] = useState("");
  const [replyEditError, setReplyEditError] = useState<string | null>(null);
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  const viewerQuery = useMemo(
    () =>
      viewerAddress ? `&viewerAddress=${encodeURIComponent(viewerAddress)}` : "",
    [viewerAddress]
  );
  const normalizedManagedCreatorUsername = useMemo(
    () => normalizeKey(managedCreatorUsername),
    [managedCreatorUsername]
  );
  const hasInitialFeed = initialFeed !== null;
  const publicActionAuthHint = useMemo(() => {
    if (!viewerAddress) return null;
    if (ownerSession.status === "checking") {
      return "アプリ認証の状態を確認しています。";
    }
    if (ownerSession.status === "unauthenticated") {
      return "クリエイター登録済みウォレットでいいねや返信などを使う場合は、操作時にだけアプリ認証が必要です。初回のみログイン用の署名確認が表示され、認証後は通常の閲覧や移動で再署名は求められません。";
    }
    return null;
  }, [ownerSession.status, viewerAddress]);

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
          // Cursor-based load-more: allow browser cache (same cursor won't change within TTL).
          // Fresh loads (append=false): bypass cache to always show latest posts.
          cache: params.append ? "default" : "no-store",
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
    setPosts(initialFeed?.items ?? []);
    setNextCursor(initialFeed?.nextCursor ?? null);
    setError(null);
    setLoading(initialFeed === null);
  }, [creatorUsername, initialFeed]);

  useEffect(() => {
    const shouldUseInitialFeed = hasInitialFeed && refreshToken === 0;
    if (shouldUseInitialFeed) {
      setNotice(null);
      return;
    }

    void fetchFeedPage({ append: false });
    setNotice(null);
  }, [fetchFeedPage, hasInitialFeed, refreshToken, viewerAddress]);

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
    setNotice("いいねや返信を続けるには、右上のウォレットから接続してください。");
    onFocusWalletSection();
  }

  function canManagePost(post: FeedPost): boolean {
    if (!managePostAddress || !normalizedManagedCreatorUsername) return false;
    return normalizeKey(post.creator.username) === normalizedManagedCreatorUsername;
  }

  function beginEdit(post: FeedPost) {
    setEditingPostId(post.id);
    setEditDraft(createEditDraft(post));
    setEditError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditDraft(null);
    setEditError(null);
  }

  function canManageReply(reply: FeedReply): boolean {
    if (!managePostAddress || !normalizedManagedCreatorUsername) return false;
    return normalizeKey(reply.creator.username) === normalizedManagedCreatorUsername;
  }

  function beginReplyEdit(reply: FeedReply) {
    setEditingReplyId(reply.id);
    setReplyEditValue(reply.body);
    setReplyEditError(null);
    setNotice(null);
  }

  function cancelReplyEdit() {
    setEditingReplyId(null);
    setReplyEditValue("");
    setReplyEditError(null);
  }

  async function handleSaveEdit(post: FeedPost): Promise<void> {
    if (!managePostAddress || editingPostId !== post.id || !editDraft) return;

    const trimmedBody = editDraft.body.trim();
    const trimmedMediaUrl = editDraft.mediaUrl.trim();
    if (!trimmedBody) {
      setEditError("投稿本文を入力してください。");
      return;
    }
    if (trimmedBody.length > 2000) {
      setEditError("投稿本文は 2000 文字以内で入力してください。");
      return;
    }
    if (editDraft.mediaType && !trimmedMediaUrl) {
      setEditError("メディア URL を入力してください。");
      return;
    }
    if (!editDraft.mediaType && trimmedMediaUrl) {
      setEditError("メディア種別を選んでください。");
      return;
    }
    if (trimmedMediaUrl && !isHttpUrl(trimmedMediaUrl)) {
      setEditError("メディア URL は http(s) 形式で入力してください。");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const result = await updateMyPostingPostContent({
      address: managePostAddress,
      postId: post.id,
      body: trimmedBody,
      mediaType: editDraft.mediaType || null,
      mediaUrl: editDraft.mediaType ? trimmedMediaUrl : null,
      projectId: editDraft.projectId || null,
    });

    if (!result.ok) {
      setEditError(
        result.error === "PROJECT_NOT_FOUND_OR_FORBIDDEN"
          ? "応援のひもづけ先を確認してください。"
          : result.error === "MEDIA_FIELDS_MISMATCH"
          ? "メディア種別と URL をそろえてください。"
          : result.error === "MEDIA_URL_INVALID"
          ? "メディア URL を確認してください。"
          : "投稿の更新に失敗しました。"
      );
      setSavingEdit(false);
      return;
    }

    updatePostInAllStates(post.id, (currentPost) => ({
      ...currentPost,
      ...result.post,
      viewerHasLiked: currentPost.viewerHasLiked,
    }));
    setNotice("投稿を更新しました。");
    setSavingEdit(false);
    cancelEdit();
  }

  async function handleDeletePost(post: FeedPost): Promise<void> {
    if (!managePostAddress) return;

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("この投稿を削除しますか？ この操作は元に戻せません。")
        : false;
    if (!confirmed) return;

    setDeletingPostId(post.id);
    setNotice(null);

    const result = await deleteMyPostingPost({
      address: managePostAddress,
      postId: post.id,
    });

    if (!result.ok) {
      setNotice("投稿の削除に失敗しました。もう一度お試しください。");
      setDeletingPostId(null);
      return;
    }

    setPosts((current) => current.filter((item) => item.id !== post.id));
    setDetailByPostId((current) => {
      const next = { ...current };
      delete next[post.id];
      return next;
    });
    setOpenPostIds((current) => {
      const next = { ...current };
      delete next[post.id];
      return next;
    });
    if (editingPostId === post.id) {
      cancelEdit();
    }
    setNotice("投稿を削除しました。");
    setDeletingPostId(null);
  }

  async function handleSaveReplyEdit(reply: FeedReply): Promise<void> {
    if (!managePostAddress) return;

    const trimmedBody = replyEditValue.trim();
    if (!trimmedBody) {
      setReplyEditError("返信内容を入力してください。");
      return;
    }
    if (trimmedBody.length > 1200) {
      setReplyEditError("返信は 1200 文字以内で入力してください。");
      return;
    }

    setSavingReplyId(reply.id);
    setReplyEditError(null);

    try {
      const response = await ownerAuthFetch({
        address: managePostAddress,
        url: `/api/replies/${encodeURIComponent(reply.id)}`,
        init: {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: managePostAddress,
            body: trimmedBody,
          }),
        },
      });
      const json = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          buildFeedActionErrorMessage(
            parseApiErrorCode(json),
            "返信の更新に失敗しました。"
          )
        );
      }

      const parsed = parseFeedReplyUpdateResponse(json);
      setDetailByPostId((current) => {
        const detail = current[reply.postId];
        if (!detail) return current;
        return {
          ...current,
          [reply.postId]: {
            ...detail,
            replies: detail.replies.map((currentReply) =>
              currentReply.id === reply.id
                ? {
                    ...currentReply,
                    ...parsed.reply,
                    viewerHasLiked: currentReply.viewerHasLiked,
                  }
                : currentReply
            ),
          },
        };
      });
      setNotice("返信を更新しました。");
      cancelReplyEdit();
    } catch (mutationError) {
      setReplyEditError(
        mutationError instanceof Error
          ? mapCommunityProtectedActionError(
              mutationError.message,
              "返信の更新に失敗しました。"
            )
          : "返信の更新に失敗しました。"
      );
    } finally {
      setSavingReplyId(null);
    }
  }

  async function handleDeleteReply(reply: FeedReply): Promise<void> {
    if (!managePostAddress) return;

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("この返信を削除しますか？ この操作は元に戻せません。")
        : false;
    if (!confirmed) return;

    setDeletingReplyId(reply.id);
    setNotice(null);

    try {
      const response = await ownerAuthFetch({
        address: managePostAddress,
        url: `/api/replies/${encodeURIComponent(reply.id)}`,
        init: {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: managePostAddress,
          }),
        },
      });
      const json = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          buildFeedActionErrorMessage(
            parseApiErrorCode(json),
            "返信の削除に失敗しました。"
          )
        );
      }

      const parsed = parseFeedReplyDeleteResponse(json);
      setDetailByPostId((current) => {
        const detail = current[parsed.postId];
        if (!detail) return current;
        return {
          ...current,
          [parsed.postId]: {
            ...detail,
            replies: detail.replies.filter(
              (currentReply) => currentReply.id !== parsed.deletedReplyId
            ),
          },
        };
      });
      updatePostInAllStates(parsed.postId, (currentPost) => ({
        ...currentPost,
        counts: {
          ...currentPost.counts,
          replies: parsed.postReplyCount,
        },
      }));
      if (editingReplyId === reply.id) {
        cancelReplyEdit();
      }
      setNotice("返信を削除しました。");
    } catch (mutationError) {
      setNotice(
        mutationError instanceof Error
          ? mapCommunityProtectedActionError(
              mutationError.message,
              "返信の削除に失敗しました。"
            )
          : "返信の削除に失敗しました。"
      );
    } finally {
      setDeletingReplyId(null);
    }
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

    const nextLiked = !post.viewerHasLiked;
    const optimisticLikeCount = Math.max(
      0,
      post.counts.likes + (nextLiked ? 1 : -1)
    );

    setPendingPostLikeIds((current) => new Set<string>(current).add(post.id));
    updatePostInAllStates(post.id, (currentPost) => ({
      ...currentPost,
      counts: {
        ...currentPost.counts,
        likes: optimisticLikeCount,
      },
      viewerHasLiked: nextLiked,
    }));

    try {
      const response = await ownerAuthFetch({
        address: viewerAddress,
        url: `/api/posts/${encodeURIComponent(post.id)}/like`,
        init: {
          method: nextLiked ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: viewerAddress }),
        },
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
      updatePostInAllStates(post.id, (currentPost) => ({
        ...currentPost,
        counts: {
          ...currentPost.counts,
          likes: post.counts.likes,
        },
        viewerHasLiked: post.viewerHasLiked,
      }));
      setNotice(
        mutationError instanceof Error
          ? mapCommunityProtectedActionError(
              mutationError.message,
              "いいねの更新に失敗しました。"
            )
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

    const nextLiked = !reply.viewerHasLiked;
    const optimisticLikeCount = Math.max(
      0,
      reply.likeCount + (nextLiked ? 1 : -1)
    );

    setDetailByPostId((current) => {
      const detail = current[postId] ?? createEmptyDetailState();
      const nextPending = new Set<string>(detail.pendingReplyLikeIds);
      nextPending.add(reply.id);
      return {
        ...current,
        [postId]: {
          ...detail,
          replies: detail.replies.map((currentReply) =>
            currentReply.id === reply.id
              ? {
                  ...currentReply,
                  likeCount: optimisticLikeCount,
                  viewerHasLiked: nextLiked,
                }
              : currentReply
          ),
          pendingReplyLikeIds: nextPending,
        },
      };
    });

    try {
      const response = await ownerAuthFetch({
        address: viewerAddress,
        url: `/api/replies/${encodeURIComponent(reply.id)}/like`,
        init: {
          method: nextLiked ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: viewerAddress }),
        },
      });
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
                    likeCount: reply.likeCount,
                    viewerHasLiked: reply.viewerHasLiked,
                  }
                : currentReply
            ),
          },
        };
      });
      setNotice(
        mutationError instanceof Error
          ? mapCommunityProtectedActionError(
              mutationError.message,
              "返信のいいね更新に失敗しました。"
            )
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
      const response = await ownerAuthFetch({
        address: viewerAddress,
        url: `/api/posts/${encodeURIComponent(postId)}/replies`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: viewerAddress,
            body,
          }),
        },
      });
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
          ? mapCommunityProtectedActionError(
              mutationError.message,
              "返信の送信に失敗しました。"
            )
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
    <section className="mt-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 sm:text-base">
            {creatorUsername ? "投稿" : "最新の投稿"}
          </h3>
          <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
            {creatorUsername
              ? "近況への返信やいいね、そのまま投稿への応援まで自然に続けられます。"
              : "いま公開されている最新の投稿を一覧で見られます。応援は各プロフィールから続けられます。"}
          </p>
        </div>
        <div className="h-1 w-14 rounded-full" style={{ backgroundColor: headerColor }} />
      </div>

      {notice ? (
        <div className="mt-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      {!notice && publicActionAuthHint ? (
        <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {publicActionAuthHint}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
          投稿を読み込み中です…
        </div>
      ) : error ? (
        <div className="mt-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          投稿の読み込みに失敗しました: {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-2.5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
          まだ公開されている投稿はありません。
        </div>
      ) : (
        <div className="mt-2.5 divide-y divide-gray-200 bg-[var(--surface)]">
          {posts.map((post) => {
            const detail = detailByPostId[post.id] ?? createEmptyDetailState();
            const cardPost = detail.post ?? post;
            const isOpen = openPostIds[post.id] === true;

            return (
              <FeedPostCard
                key={post.id}
                post={cardPost}
                headerAction={
                  canManagePost(cardPost) ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="manage-pill"
                        onClick={() => {
                          beginEdit(cardPost);
                        }}
                        disabled={savingEdit || deletingPostId === post.id}
                      >
                        {editingPostId === post.id ? "編集中" : "編集"}
                      </button>
                      <button
                        type="button"
                        className="manage-pill-danger"
                        onClick={() => {
                          void handleDeletePost(cardPost);
                        }}
                        disabled={deletingPostId === post.id || savingEdit}
                      >
                        {deletingPostId === post.id ? "削除中..." : "削除"}
                      </button>
                    </div>
                  ) : goalAchievedAtMs !== null &&
                    new Date(cardPost.createdAt).getTime() >= goalAchievedAtMs ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      目標達成後の活動
                    </span>
                  ) : null
                }
                selectedForTip={selectedPostId === post.id}
                canTip={isTipSupported(cardPost, projectIdsByCurrency)}
                likeInteractive={viewerAddress !== null}
                tipInteractive={
                  viewerAddress !== null &&
                  isTipSupported(cardPost, projectIdsByCurrency)
                }
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
                {editingPostId === post.id && editDraft ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            投稿を編集
                          </div>
                          <p className="mt-1 text-xs leading-6 text-gray-500">
                            本文や添付、応援のひもづけをここで直せます。
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-gray-50"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                        >
                          キャンセル
                        </button>
                      </div>

                      <div className="mt-2.5 space-y-2.5">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            本文
                          </label>
                          <textarea
                            className="input mt-1 min-h-[108px]"
                            value={editDraft.body}
                            onChange={(event) => {
                              setEditDraft((current) =>
                                current
                                  ? { ...current, body: event.target.value }
                                  : current
                              );
                            }}
                            disabled={savingEdit}
                          />
                          <div className="mt-1 text-[10px] text-gray-500">
                            {editDraft.body.trim().length}/2000
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              応援のひもづけ
                            </label>
                            <select
                              className="input mt-1"
                              value={editDraft.projectId}
                              onChange={(event) => {
                                setEditDraft((current) =>
                                  current
                                    ? { ...current, projectId: event.target.value }
                                    : current
                                );
                              }}
                              disabled={savingEdit}
                            >
                              <option value="">なし</option>
                              {manageProjectOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              メディア種別
                            </label>
                            <select
                              className="input mt-1"
                              value={editDraft.mediaType}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setEditDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        mediaType:
                                          nextValue === "IMAGE" ||
                                          nextValue === "VIDEO" ||
                                          nextValue === "LINK"
                                            ? nextValue
                                            : "",
                                      }
                                    : current
                                );
                              }}
                              disabled={savingEdit}
                            >
                              <option value="">なし</option>
                              <option value="IMAGE">画像</option>
                              <option value="VIDEO">動画リンク</option>
                              <option value="LINK">外部リンク</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              メディア URL
                            </label>
                            <input
                              type="url"
                              className="input mt-1"
                              value={editDraft.mediaUrl}
                              onChange={(event) => {
                                setEditDraft((current) =>
                                  current
                                    ? { ...current, mediaUrl: event.target.value }
                                    : current
                                );
                              }}
                              placeholder="https://example.com/..."
                              disabled={savingEdit}
                            />
                          </div>
                        </div>

                        {editError ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                            {editError}
                          </div>
                        ) : null}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              void handleSaveEdit(cardPost);
                            }}
                            disabled={savingEdit}
                          >
                            {savingEdit ? "保存中..." : "保存する"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isOpen ? (
                  <div className="space-y-3">
                    {detail.loading ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-500">
                        返信を読み込み中です…
                      </div>
                    ) : detail.error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                        返信の読み込みに失敗しました: {detail.error}
                      </div>
                    ) : (
                      <>
                        <ReplyList
                          replies={detail.replies}
                          pendingReplyLikeIds={detail.pendingReplyLikeIds}
                          canManageReply={canManageReply}
                          editingReplyId={editingReplyId}
                          editValue={replyEditValue}
                          editError={replyEditError}
                          savingReplyId={savingReplyId}
                          deletingReplyId={deletingReplyId}
                          onBeginEdit={beginReplyEdit}
                          onCancelEdit={cancelReplyEdit}
                          onEditValueChange={setReplyEditValue}
                          onSaveEdit={(reply) => {
                            void handleSaveReplyEdit(reply);
                          }}
                          onDelete={(reply) => {
                            void handleDeleteReply(reply);
                          }}
                          onToggleLike={(reply) => {
                            void handleToggleReplyLike(post.id, reply);
                          }}
                        />
                        <ReplyComposer
                          value={detail.replyInput}
                          disabled={!viewerAddress}
                          submitting={detail.replying}
                          viewerConnected={viewerAddress !== null}
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
        <div className="mt-2.5 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-gray-200 bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
