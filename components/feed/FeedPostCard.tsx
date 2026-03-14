"use client";

import Link from "next/link";
import React from "react";

import type { FeedPost } from "@/components/feed/feedTypes";

type Props = {
  post: FeedPost;
  selectedForTip: boolean;
  canTip: boolean;
  showTipAction: boolean;
  liking: boolean;
  repliesOpen: boolean;
  detailLoading: boolean;
  onToggleLike: () => void;
  onToggleReplies: () => void;
  onShare: () => void;
  onTip: () => void;
  children?: React.ReactNode;
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

export function FeedPostCard(props: Props) {
  const {
    post,
    selectedForTip,
    canTip,
    showTipAction,
    liking,
    repliesOpen,
    detailLoading,
    onToggleLike,
    onToggleReplies,
    onShare,
    onTip,
    children,
  } = props;

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <Link
          href={`/${post.creator.username}`}
          className="transition hover:opacity-80"
          aria-label={`${post.creator.displayName} のページを見る`}
        >
          {post.creator.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.creator.avatarUrl}
              alt={post.creator.displayName}
              className="h-11 w-11 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
              {post.creator.displayName.slice(0, 1)}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${post.creator.username}`}
              className="flex min-w-0 flex-wrap items-center gap-2 hover:opacity-80"
              aria-label={`${post.creator.displayName} のページを見る`}
            >
              <div className="text-sm font-semibold text-gray-900">
                {post.creator.displayName}
              </div>
              <div className="text-xs text-gray-500">@{post.creator.username}</div>
            </Link>
            <div className="text-xs text-gray-400">
              {formatDateTime(post.createdAt)}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {post.project ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                {post.project.title} / {post.project.currency}
              </span>
            ) : null}
            {post.aiGenerated ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                AI生成
              </span>
            ) : null}
            {selectedForTip ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                応援先を選択中
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-800">
        {post.body}
      </div>

      {post.mediaUrl ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          {post.mediaType === "IMAGE" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt="post media"
                className="max-h-[420px] w-full object-cover"
              />
            </>
          ) : (
            <a
              href={post.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="block p-4 text-sm text-sky-700 underline hover:text-sky-800"
            >
              {post.mediaType === "VIDEO" ? "動画リンクを開く" : "リンクを開く"}
            </a>
          )}
        </div>
      ) : null}

      <div
        className={`mt-5 grid gap-2 ${
          showTipAction ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        <button
          type="button"
          className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
            repliesOpen
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          onClick={onToggleReplies}
          disabled={detailLoading}
        >
          返信 {post.counts.replies}
        </button>

        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            post.viewerHasLiked
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          onClick={onToggleLike}
          disabled={liking}
        >
          いいね {post.counts.likes}
        </button>

        <button
          type="button"
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          onClick={onShare}
        >
          共有
        </button>

        {showTipAction ? (
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              canTip
                ? selectedForTip
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-950 text-white hover:bg-slate-800"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
            onClick={onTip}
            disabled={!canTip}
          >
            {selectedForTip ? "応援先を確認" : `応援 ${post.counts.tips}`}
          </button>
        ) : null}
      </div>

      {children ? <div className="mt-4 border-t border-gray-200 pt-4">{children}</div> : null}
    </article>
  );
}
