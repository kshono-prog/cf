"use client";

import Link from "next/link";
import React from "react";

import type { FeedPost } from "@/components/feed/feedTypes";

type Props = {
  post: FeedPost;
  headerAction?: React.ReactNode;
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

function getYouTubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0] ?? "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") ?? "";
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] ?? "";
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] ?? "";
      }
    }

    const trimmedId = videoId.trim();
    if (!trimmedId) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(trimmedId)}`;
  } catch {
    return null;
  }
}

export function FeedPostCard(props: Props) {
  const {
    post,
    headerAction,
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
  const youTubeEmbedUrl = post.mediaUrl ? getYouTubeEmbedUrl(post.mediaUrl) : null;
  const showEmbeddedVideo =
    youTubeEmbedUrl !== null &&
    (post.mediaType === "VIDEO" || post.mediaType === "LINK");

  return (
    <article className="px-3.5 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-start gap-2.5">
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
              className="h-9.5 w-9.5 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-9.5 w-9.5 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
              {post.creator.displayName.slice(0, 1)}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${post.creator.username}`}
                  className="flex min-w-0 flex-wrap items-center gap-2 hover:opacity-80"
                  aria-label={`${post.creator.displayName} のページを見る`}
                >
                  <div className="text-[12px] font-semibold text-gray-900 sm:text-[13px]">
                    {post.creator.displayName}
                  </div>
                  <div className="text-[11px] text-gray-500">@{post.creator.username}</div>
                </Link>
                <div className="text-[11px] text-gray-400">
                  {formatDateTime(post.createdAt)}
                </div>
              </div>
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {post.project ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                {post.project.title} / {post.project.currency}
              </span>
            ) : null}
            {post.aiGenerated ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                AI生成
              </span>
            ) : null}
            {selectedForTip ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                応援先を選択中
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2.5 whitespace-pre-wrap text-[13px] leading-6 text-gray-800">
        {post.body}
      </div>

      {post.mediaUrl ? (
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          {post.mediaType === "IMAGE" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt="post media"
                className="max-h-[420px] w-full object-cover"
              />
            </>
          ) : showEmbeddedVideo ? (
            <div className="bg-black">
              <div className="aspect-video w-full">
                <iframe
                  src={youTubeEmbedUrl}
                  title={`${post.creator.displayName} の動画`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="block border-t border-white/10 px-4 py-3 text-xs font-medium text-white/80 transition hover:text-white"
              >
                YouTube で開く
              </a>
            </div>
          ) : (
            <a
              href={post.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="block px-4 py-3 text-sm text-sky-700 underline hover:text-sky-800"
            >
              {post.mediaType === "VIDEO" ? "動画リンクを開く" : "リンクを開く"}
            </a>
          )}
        </div>
      ) : null}

      <div
        className={`mt-3 grid gap-1.5 ${
          showTipAction ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        <button
          type="button"
          className={`${
            repliesOpen
              ? "action-pill-active"
              : "action-pill"
          }`}
          onClick={onToggleReplies}
          disabled={detailLoading}
        >
          返信 {post.counts.replies}
        </button>

        <button
          type="button"
          className={`${
            post.viewerHasLiked
              ? "action-pill-active"
              : "action-pill"
          }`}
          onClick={onToggleLike}
          disabled={liking}
        >
          いいね {post.counts.likes}
        </button>

        <button
          type="button"
          className="action-pill"
          onClick={onShare}
        >
          共有
        </button>

        {showTipAction ? (
          <button
            type="button"
            className={`${
              canTip
                ? selectedForTip
                  ? "action-pill-active"
                  : "btn"
                : "action-pill cursor-not-allowed text-gray-400"
            }`}
            onClick={onTip}
            disabled={!canTip}
          >
            {selectedForTip ? "応援先を確認" : `応援 ${post.counts.tips}`}
          </button>
        ) : null}
      </div>

      {children ? <div className="mt-2.5 border-t border-gray-200 pt-2.5">{children}</div> : null}
    </article>
  );
}
