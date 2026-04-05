import Image from "next/image";
import Link from "next/link";

import type { CreatorFeedSectionProps } from "@/components/feed/CreatorFeedSection";
import {
  FeedActionControl,
  LikeIcon,
  ReplyIcon,
  ShareIcon,
  TipIcon,
} from "@/components/feed/FeedPostCard";
import {
  getFeedPostProjectSupportHref,
  type FeedPost,
} from "@/components/feed/feedTypes";

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

function StaticAvatar(props: {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size: number;
}) {
  if (!props.src) {
    return (
      <div
        style={{ width: props.size, height: props.size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-sky-500 font-semibold text-white ring-2 ring-[var(--line)]"
        aria-label={props.alt}
      >
        {props.fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={props.src}
      alt={props.alt}
      width={props.size}
      height={props.size}
      quality={95}
      sizes={`${props.size}px`}
      className="shrink-0 rounded-full object-cover bg-[var(--surface-subtle)] ring-2 ring-[var(--line)]"
    />
  );
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
          <StaticAvatar
            src={post.creator.avatarUrl}
            alt={post.creator.displayName}
            fallbackText={post.creator.displayName.slice(0, 1)}
            size={38}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${post.creator.username}`}
              className="flex min-w-0 flex-wrap items-center gap-2 hover:opacity-80"
            >
              <div className="text-[12px] font-semibold text-[var(--text)] sm:text-[13px]">
                {post.creator.displayName}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)]">
                @{post.creator.username}
              </div>
            </Link>
            <div className="text-[11px] text-[var(--muted)]">
              {formatDateTime(post.createdAt)}
            </div>
          </div>

          {post.project ? (
            <div className="mt-1.5">
              {projectSupportHref ? (
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
              )}
            </div>
          ) : null}

          <div className="mt-2.5 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text)]">
            {post.body}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5 sm:gap-6">
            <FeedActionControl
              label="返信"
              icon={<ReplyIcon />}
              count={post.counts.replies}
              tone="reply"
            />
            <FeedActionControl
              label="いいね"
              icon={<LikeIcon />}
              count={post.counts.likes}
              tone="like"
            />
            <FeedActionControl label="共有" icon={<ShareIcon />} />
            {showTipAction ? (
              <FeedActionControl
                label="応援"
                icon={<TipIcon />}
                count={post.counts.tips}
                tone="tip"
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeedPreviewSection({
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
          <h3 className="text-[15px] font-semibold text-[var(--text)] sm:text-base">
            {creatorUsername ? "投稿" : "最新の投稿"}
          </h3>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--text-subtle)]">
            {creatorUsername
              ? "近況への返信やいいね、そのまま投稿への応援まで自然に続けられます。"
              : "いま公開されている最新の投稿を一覧で見られます。応援は各プロフィールから続けられます。"}
          </p>
        </div>
        <div
          className="h-1 w-14 rounded-full"
          style={{ backgroundColor: headerColor }}
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-subtle)]">
          投稿を読み込み中です…
        </div>
      ) : (
        <div className="mt-2.5 divide-y divide-[var(--line)] bg-[var(--surface)]">
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
