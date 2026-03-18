"use client";

import React from "react";
import type { Address } from "viem";

import {
  fetchMyPostingPosts,
  updateMyPostingPostStatus,
  type PostingManagedPost,
} from "@/lib/mypage/postingApi";
import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";

type Props = {
  address: Address | undefined;
  username: string;
  refreshToken: number;
  onPostsChanged: () => void;
};

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

function getStatusLabel(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "公開中";
    case "ARCHIVED":
      return "アーカイブ済み";
    case "DRAFT":
      return "下書き";
    default:
      return status;
  }
}

function buildPreview(body: string): string {
  if (body.length <= 140) return body;
  return `${body.slice(0, 139)}…`;
}

export function MyPostsCard(props: Props) {
  const [posts, setPosts] = React.useState<PostingManagedPost[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingPostId, setPendingPostId] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);

  const loadPosts = React.useCallback(
    async (cursor?: string | null): Promise<void> => {
      if (!props.address) {
        setPosts([]);
        setNextCursor(null);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const result = await fetchMyPostingPosts({
        address: props.address,
        cursor,
        limit: 12,
      });

      if (!result.ok) {
        setError("投稿一覧の取得に失敗しました。");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setPosts((current) =>
        cursor ? [...current, ...result.data.items] : result.data.items
      );
      setNextCursor(result.data.nextCursor);
      setTotalCount(result.data.totalCount);
      setLoading(false);
      setLoadingMore(false);
    },
    [props.address]
  );

  React.useEffect(() => {
    void loadPosts(null);
  }, [loadPosts, props.refreshToken]);

  async function handleToggleArchive(post: PostingManagedPost): Promise<void> {
    if (!props.address) return;
    setPendingPostId(post.id);
    setError(null);

    const result = await updateMyPostingPostStatus({
      address: props.address,
      postId: post.id,
      status: post.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED",
    });

    if (!result.ok) {
      setError("投稿状態の更新に失敗しました。");
      setPendingPostId(null);
      return;
    }

    setPosts((current) =>
      current.map((item) => (item.id === result.post.id ? result.post : item))
    );
    props.onPostsChanged();
    setPendingPostId(null);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">自分の投稿</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            直近の投稿状況、反応、投稿ごとの支援を確認します。
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${props.username}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
          >
            公開ページを開く
          </a>
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
            onClick={() => void loadPosts(null)}
            disabled={loading}
          >
            更新
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        合計 {totalCount} 件の投稿があります。公開中のものは公開ページの feed に表示されます。
      </div>

      {error ? <div className="mt-3"><WorkspaceStatusNotice tone="error" title={error} /></div> : null}

      {loading ? (
        <div className="mt-4 text-sm text-gray-500">投稿を読み込み中です...</div>
      ) : posts.length === 0 ? (
        <div className="mt-4">
          <WorkspaceEmptyState
            title="まだ投稿がありません"
            description="最初の活動報告や進捗共有を投稿すると、公開ページのストーリーが作りやすくなります。"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700">
                  {getStatusLabel(post.status)}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700">
                  {post.visibility}
                </span>
                {post.project ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700">
                    {post.project.title} / {post.project.currency}
                  </span>
                ) : null}
                {post.aiGenerated ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                    AI生成
                  </span>
                ) : null}
                <span className="text-[11px] text-gray-500">
                  {formatDateTime(post.createdAt)}
                </span>
              </div>

              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                {buildPreview(post.body)}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>いいね {post.counts.likes}</span>
                <span>返信 {post.counts.replies}</span>
                <span>支援 {post.counts.tips}</span>
                <span>JPYC {post.tipTotals.JPYC}</span>
                <span>USDC {post.tipTotals.USDC}</span>
                <span>
                  分析 {post.analytics ? `${post.analytics.impressionCount} imp` : "計測待ち"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-gray-500">
                  {post.status === "ARCHIVED"
                    ? "アーカイブすると公開 feed から外れます。"
                    : "必要に応じて公開状態を切り替えられます。"}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
                  onClick={() => void handleToggleArchive(post)}
                  disabled={pendingPostId === post.id}
                >
                  {pendingPostId === post.id
                    ? "更新中..."
                    : post.status === "ARCHIVED"
                    ? "公開に戻す"
                    : "アーカイブ"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {nextCursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-800"
            onClick={() => void loadPosts(nextCursor)}
            disabled={loadingMore}
          >
            {loadingMore ? "読み込み中..." : "さらに見る"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
