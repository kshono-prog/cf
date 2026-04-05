"use client";

import Link from "next/link";
import React from "react";

import {
  getFeedPostProjectSupportHref,
  type FeedPost,
} from "@/components/feed/feedTypes";
import { LinkPreviewCard } from "@/components/feed/LinkPreviewCard";
import { Avatar } from "@/components/shared/Avatar";

export function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="feed-action-icon" aria-hidden="true">
      <path
        d="M7 10.5c0-3.59 3.13-6.5 7-6.5s7 2.91 7 6.5-3.13 6.5-7 6.5c-.72 0-1.42-.1-2.07-.29L6 19l1.57-4.2A6.08 6.08 0 0 1 7 10.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function LikeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="feed-action-icon" aria-hidden="true">
      <path
        d="M12 20.4 4.9 13.6A4.67 4.67 0 0 1 11.6 7l.4.41.4-.4a4.67 4.67 0 0 1 6.6 6.6L12 20.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="feed-action-icon" aria-hidden="true">
      <path
        d="M8 12h8m0 0-3-3m3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13 5h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function TipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="feed-action-icon" aria-hidden="true">
      <path
        d="M12 3v18m-5-5 5 5 5-5M7 8l5-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type FeedActionControlProps = {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "default" | "reply" | "like" | "tip";
};

export function FeedActionControl(props: FeedActionControlProps) {
  const {
    label,
    icon,
    count,
    active = false,
    disabled = false,
    onClick,
    tone = "default",
  } = props;
  const className = [
    "feed-action",
    active ? "feed-action-active" : "",
    onClick ? "" : "feed-action-static",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="feed-action-icon-wrap">{icon}</span>
      {typeof count === "number" ? <span className="feed-action-count">{count}</span> : null}
    </>
  );

  if (!onClick) {
    return (
      <div className={`${className} pointer-events-none`} aria-label={label} data-tone={tone}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-tone={tone}
    >
      {content}
    </button>
  );
}

type Props = {
  post: FeedPost;
  headerAction?: React.ReactNode;
  selectedForTip: boolean;
  canTip: boolean;
  likeInteractive: boolean;
  tipInteractive: boolean;
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
    likeInteractive,
    tipInteractive,
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
  const projectSupportHref = getFeedPostProjectSupportHref(post);

  return (
    <article className="px-3.5 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-start gap-2.5">
        <Link
          href={`/${post.creator.username}`}
          className="transition hover:opacity-80"
          aria-label={`${post.creator.displayName} のページを見る`}
        >
          <Avatar
            src={post.creator.avatarUrl}
            alt={post.creator.displayName}
            fallbackText={post.creator.displayName.slice(0, 1)}
            size={38}
          />
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
                  <div className="text-[12px] font-semibold text-[var(--text)] sm:text-[13px]">
                    {post.creator.displayName}
                  </div>
                  <div className="text-[11px] text-[var(--text-subtle)]">@{post.creator.username}</div>
                </Link>
                <div className="text-[11px] text-[var(--muted)]">
                  {formatDateTime(post.createdAt)}
                </div>
              </div>
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {post.project ? (
              projectSupportHref ? (
                <Link
                  href={projectSupportHref}
                  className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 transition hover:bg-sky-500/15"
                >
                  {post.project.title} / {post.project.currency}
                </Link>
              ) : (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600">
                  {post.project.title} / {post.project.currency}
                </span>
              )
            ) : null}
            {post.aiGenerated ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3 shrink-0"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 1.5a.75.75 0 0 1 .75.75v1.25h1.25a.75.75 0 0 1 0 1.5H8.75v1.25a.75.75 0 0 1-1.5 0V5H6a.75.75 0 0 1 0-1.5h1.25V2.25A.75.75 0 0 1 8 1.5ZM3 8.5a.75.75 0 0 1 .75-.75h.5V7a.75.75 0 0 1 1.5 0v.75h.5a.75.75 0 0 1 0 1.5h-.5V10a.75.75 0 0 1-1.5 0v-.75h-.5A.75.75 0 0 1 3 8.5Zm8.25 2a.75.75 0 0 1 .75.75v.5h.5a.75.75 0 0 1 0 1.5h-.5v.5a.75.75 0 0 1-1.5 0v-.5h-.5a.75.75 0 0 1 0-1.5h.5v-.5a.75.75 0 0 1 .75-.75Z" />
                </svg>
                AI投稿
              </span>
            ) : null}
            {selectedForTip ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                応援先を選択中
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2.5 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text)]">
        {post.body}
      </div>

      {post.mediaUrl ? (
        post.mediaType === "LINK" ? (
          <LinkPreviewCard url={post.mediaUrl} />
        ) : (
          <div className="mt-2.5 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]">
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
                className="block px-4 py-3 text-sm text-sky-600 underline hover:text-sky-500"
              >
                動画リンクを開く
              </a>
            )}
          </div>
        )
      ) : null}

      <div
        className={`mt-3 flex flex-wrap items-center gap-5 sm:gap-6`}
      >
        <FeedActionControl
          label="返信を見る"
          icon={<ReplyIcon />}
          count={post.counts.replies}
          active={repliesOpen}
          tone="reply"
          onClick={onToggleReplies}
          disabled={detailLoading}
        />

        <FeedActionControl
          label={
            likeInteractive
              ? post.viewerHasLiked
                ? "いいね済み"
                : "いいね"
              : "いいね数"
          }
          icon={<LikeIcon />}
          count={post.counts.likes}
          active={likeInteractive && post.viewerHasLiked}
          tone="like"
          onClick={likeInteractive ? onToggleLike : undefined}
          disabled={liking}
        />

        <FeedActionControl label="共有" icon={<ShareIcon />} onClick={onShare} />

        {showTipAction ? (
          <FeedActionControl
            label={
              tipInteractive
                ? selectedForTip
                  ? "応援先を確認"
                  : "応援する"
                : "応援数"
            }
            icon={<TipIcon />}
            count={post.counts.tips}
            active={tipInteractive && selectedForTip}
            tone="tip"
            onClick={tipInteractive ? onTip : undefined}
            disabled={tipInteractive ? !canTip : false}
          />
        ) : null}
      </div>

      {children ? <div className="mt-2.5 border-t border-[var(--line)] pt-2.5">{children}</div> : null}
    </article>
  );
}
