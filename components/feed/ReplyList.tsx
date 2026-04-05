"use client";

import { FeedActionControl, LikeIcon } from "@/components/feed/FeedPostCard";
import type { FeedReply } from "@/components/feed/feedTypes";
import { Avatar } from "@/components/shared/Avatar";

type Props = {
  replies: FeedReply[];
  pendingReplyLikeIds: Set<string>;
  onToggleLike: (reply: FeedReply) => void;
  canManageReply: (reply: FeedReply) => boolean;
  editingReplyId: string | null;
  editValue: string;
  editError: string | null;
  savingReplyId: string | null;
  deletingReplyId: string | null;
  onBeginEdit: (reply: FeedReply) => void;
  onCancelEdit: () => void;
  onEditValueChange: (nextValue: string) => void;
  onSaveEdit: (reply: FeedReply) => void;
  onDelete: (reply: FeedReply) => void;
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

export function ReplyList(props: Props) {
  const {
    replies,
    pendingReplyLikeIds,
    onToggleLike,
    canManageReply,
    editingReplyId,
    editValue,
    editError,
    savingReplyId,
    deletingReplyId,
    onBeginEdit,
    onCancelEdit,
    onEditValueChange,
    onSaveEdit,
    onDelete,
  } = props;

  if (replies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-subtle)]">
        まだ返信はありません。最初のひとことを送れます。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3"
        >
          <div className="flex items-start gap-2.5">
            <Avatar
              src={reply.creator.avatarUrl}
              alt={reply.creator.displayName}
              fallbackText={reply.creator.displayName.slice(0, 1)}
              size={34}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {reply.creator.displayName}
                  </span>
                  <span className="text-[11px] text-[var(--text-subtle)]">
                    @{reply.creator.username}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {formatDateTime(reply.createdAt)}
                  </span>
                  {reply.aiGenerated ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      AI
                    </span>
                  ) : null}
                </div>
                {canManageReply(reply) ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="manage-pill"
                      onClick={() => onBeginEdit(reply)}
                      disabled={
                        savingReplyId === reply.id || deletingReplyId === reply.id
                      }
                    >
                      {editingReplyId === reply.id ? "編集中" : "編集"}
                    </button>
                    <button
                      type="button"
                      className="manage-pill-danger"
                      onClick={() => onDelete(reply)}
                      disabled={
                        deletingReplyId === reply.id || savingReplyId === reply.id
                      }
                    >
                      {deletingReplyId === reply.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                ) : null}
              </div>

              {editingReplyId === reply.id ? (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                  <textarea
                    className="input min-h-[96px] w-full"
                    value={editValue}
                    onChange={(event) => onEditValueChange(event.target.value)}
                    disabled={savingReplyId === reply.id}
                  />
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    {editValue.trim().length}/1200
                  </div>
                  {editError ? (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                      {editError}
                    </div>
                  ) : null}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-subtle)]"
                      onClick={onCancelEdit}
                      disabled={savingReplyId === reply.id}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onSaveEdit(reply)}
                      disabled={savingReplyId === reply.id}
                    >
                      {savingReplyId === reply.id ? "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-subtle)]">
                  {reply.body}
                </p>
              )}

              <div className="mt-3 flex items-center">
                <FeedActionControl
                  label={reply.viewerHasLiked ? "いいね済み" : "いいね"}
                  icon={<LikeIcon />}
                  count={reply.likeCount}
                  active={reply.viewerHasLiked}
                  tone="like"
                  onClick={() => onToggleLike(reply)}
                  disabled={pendingReplyLikeIds.has(reply.id)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
