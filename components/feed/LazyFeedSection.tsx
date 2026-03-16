"use client";

import Link from "next/link";
import { Suspense, lazy } from "react";

import type { CreatorFeedSectionProps } from "@/components/feed/CreatorFeedSection";
import {
  getFeedPostProjectSupportHref,
  type FeedPost,
} from "@/components/feed/feedTypes";

const CreatorFeedSection = lazy(async () => {
  const imported = await import("@/components/feed/CreatorFeedSection");
  return { default: imported.CreatorFeedSection };
});

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

function FeedPreviewRow({
  post,
  showTipAction,
}: {
  post: FeedPost;
  showTipAction: boolean;
}) {
  const projectSupportHref = getFeedPostProjectSupportHref(post);

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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${post.creator.username}`}
              className="flex min-w-0 flex-wrap items-center gap-2 hover:opacity-80"
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

          {post.project ? (
            <div className="mt-1.5">
              {projectSupportHref ? (
                <Link
                  href={projectSupportHref}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  {post.project.title} / {post.project.currency}
                </Link>
              ) : (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  {post.project.title} / {post.project.currency}
                </span>
              )}
            </div>
          ) : null}

          <div className="mt-2.5 whitespace-pre-wrap text-[13px] leading-6 text-gray-800">
            {post.body}
          </div>

          <div
            className={`mt-3 grid gap-1.5 ${
              showTipAction ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
            }`}
          >
            <div className="action-pill pointer-events-none">
              返信 {post.counts.replies}
            </div>
            <div className="action-pill pointer-events-none">
              いいね {post.counts.likes}
            </div>
            <div className="action-pill pointer-events-none">共有</div>
            {showTipAction ? (
              <div className="action-pill pointer-events-none">
                応援 {post.counts.tips}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedPreviewFallback({
  creatorUsername,
  headerColor,
  showTipAction,
  initialFeed,
}: Pick<
  CreatorFeedSectionProps,
  "creatorUsername" | "headerColor" | "showTipAction" | "initialFeed"
>) {
  const items = initialFeed?.items ?? [];

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

      {items.length === 0 ? (
        <div className="mt-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
          投稿を読み込み中です…
        </div>
      ) : (
        <div className="mt-2.5 divide-y divide-gray-200 bg-white">
          {items.map((post) => (
            <FeedPreviewRow
              key={post.id}
              post={post}
              showTipAction={showTipAction ?? true}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function LazyFeedSection(props: CreatorFeedSectionProps) {
  return (
    <Suspense
      fallback={
        <FeedPreviewFallback
          creatorUsername={props.creatorUsername}
          headerColor={props.headerColor}
          showTipAction={props.showTipAction}
          initialFeed={props.initialFeed}
        />
      }
    >
      <CreatorFeedSection {...props} />
    </Suspense>
  );
}
