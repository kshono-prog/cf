"use client";

import type { FeedReply } from "@/components/feed/feedTypes";

type Props = {
  replies: FeedReply[];
  pendingReplyLikeIds: Set<string>;
  onToggleLike: (reply: FeedReply) => void;
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

export function ReplyList({ replies, pendingReplyLikeIds, onToggleLike }: Props) {
  if (replies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
        まだ返信はありません。最初のひとことを送れます。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            {reply.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reply.creator.avatarUrl}
                alt={reply.creator.displayName}
                className="h-9 w-9 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-500">
                {reply.creator.displayName.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {reply.creator.displayName}
                </span>
                <span className="text-[11px] text-gray-500">
                  @{reply.creator.username}
                </span>
                <span className="text-[11px] text-gray-400">
                  {formatDateTime(reply.createdAt)}
                </span>
                {reply.aiGenerated ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    AI
                  </span>
                ) : null}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {reply.body}
              </p>

              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>いいね {reply.likeCount}</span>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 transition ${
                    reply.viewerHasLiked
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => onToggleLike(reply)}
                  disabled={pendingReplyLikeIds.has(reply.id)}
                >
                  {reply.viewerHasLiked ? "いいね済み" : "いいね"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
