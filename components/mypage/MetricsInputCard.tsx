"use client";

// components/mypage/MetricsInputCard.tsx
// Manual ContentMetricSnapshot entry form + recent snapshot list.

import React from "react";
import type { Address } from "viem";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import type { PostingProjectOption } from "@/lib/mypage/postingApi";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";

const PLATFORMS = ["YouTube", "Twitter/X", "Instagram", "TikTok", "CF", "その他"] as const;

type Snapshot = {
  id: string;
  platform: string;
  contentUrl: string | null;
  capturedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

type Props = {
  address: Address | undefined;
  projectOptions: PostingProjectOption[];
  refreshToken?: number;
  onAdded?: () => void;
};

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (!("error" in value)) {
    return null;
  }

  return typeof value.error === "string" ? value.error : null;
}

export function MetricsInputCard(props: Props) {
  const [platform, setPlatform] = React.useState<string>("YouTube");
  const [contentUrl, setContentUrl] = React.useState("");
  const [views, setViews] = React.useState("");
  const [likes, setLikes] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [shares, setShares] = React.useState("");
  const [projectId, setProjectId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = React.useState(false);

  const toSafeInt = (v: string): number | null => {
    const s = v.trim();
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const loadSnapshots = React.useCallback(async () => {
    if (!props.address) return;
    setLoadingSnapshots(true);
    try {
      const res = await fetch(
        `/api/metrics/snapshots?address=${props.address}&limit=8`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = (await res.json()) as { snapshots?: Snapshot[] };
        setSnapshots(data.snapshots ?? []);
      }
    } finally {
      setLoadingSnapshots(false);
    }
  }, [props.address]);

  React.useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots, props.refreshToken]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!props.address) return;
      if (!contentUrl.trim()) {
        setFeedback(
          mapWorkspaceActionError("CONTENT_URL_REQUIRED", "URL を入力してください。")
        );
        return;
      }
      setSaving(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/metrics/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: props.address,
            platform,
            contentUrl: contentUrl.trim(),
            views: toSafeInt(views),
            likes: toSafeInt(likes),
            comments: toSafeInt(comments),
            shares: toSafeInt(shares),
            projectId: projectId || undefined,
          }),
        });
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          setFeedback(
            mapWorkspaceActionError(
              getErrorMessage(body) ?? "INTERNAL_ERROR",
              "保存に失敗しました。"
            )
          );
          return;
        }
        setFeedback(buildWorkspaceActionSuccessNotice("metricsSaved"));
        setContentUrl("");
        setViews("");
        setLikes("");
        setComments("");
        setShares("");
        props.onAdded?.();
        void loadSnapshots();
      } catch {
        setFeedback(
          mapWorkspaceActionError("INTERNAL_ERROR", "通信エラーが発生しました。")
        );
      } finally {
        setSaving(false);
      }
    },
    [
      props,
      platform,
      contentUrl,
      views,
      likes,
      comments,
      shares,
      projectId,
      loadSnapshots,
    ]
  );

  const inputCls =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  const labelCls = "block text-xs font-medium text-[var(--muted)] mb-0.5";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-4">
      <div className="text-sm font-semibold text-[var(--text)]">指標を記録する</div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>プラットフォーム</label>
            <select
              className={inputCls}
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {props.projectOptions.length > 0 && (
            <div>
              <label className={labelCls}>プロジェクト（任意）</label>
              <select
                className={inputCls}
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                }}
              >
                <option value="">未選択</option>
                {props.projectOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>投稿 URL</label>
          <input
            type="url"
            className={inputCls}
            placeholder="https://..."
            value={contentUrl}
            onChange={(e) => {
              setContentUrl(e.target.value);
            }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className={labelCls}>再生/表示</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="0"
              value={views}
              onChange={(e) => {
                setViews(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>いいね</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="0"
              value={likes}
              onChange={(e) => {
                setLikes(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>コメント</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="0"
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>シェア</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="0"
              value={shares}
              onChange={(e) => {
                setShares(e.target.value);
              }}
            />
          </div>
        </div>

        {feedback ? (
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        ) : null}

        <button
          type="submit"
          disabled={saving || !props.address}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "保存中…" : "記録する"}
        </button>
      </form>

      {/* Recent snapshots */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-[var(--muted)]">直近の記録</div>
        {loadingSnapshots && (
          <p className="text-[11px] text-[var(--muted)]">読み込み中…</p>
        )}
        {!loadingSnapshots && snapshots.length === 0 && (
          <p className="text-[11px] text-[var(--muted)]">まだ記録がありません。</p>
        )}
        {snapshots.length > 0 && (
          <div className="space-y-0.5">
            {snapshots.map((s) => {
              const capturedDate = new Date(s.capturedAt);
              const dateLabel = `${(capturedDate.getMonth() + 1).toString()}/${capturedDate.getDate().toString()}`;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-1 border-b border-[var(--line)] last:border-0 gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
                    <span className="shrink-0 font-medium text-[var(--text)]">
                      {s.platform}
                    </span>
                    <span className="text-[var(--muted)]">{dateLabel}</span>
                    {s.contentUrl && (
                      <span className="truncate text-[var(--muted)] max-w-[100px]">
                        {s.contentUrl.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-2 text-[11px] text-[var(--muted)]">
                    {s.views !== null && (
                      <span>{s.views.toLocaleString()} 回</span>
                    )}
                    {s.likes !== null && <span>♥{s.likes.toLocaleString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
