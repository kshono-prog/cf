"use client";

import { useState, type FormEvent } from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { postGrowthEvent } from "@/lib/growth/client";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";

const CHANNEL_OPTIONS = [
  { value: "x", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "story", label: "Story" },
  { value: "english", label: "英語投稿" },
  { value: "other", label: "Other" },
] as const;

type ShareChannel = (typeof CHANNEL_OPTIONS)[number]["value"];

function isShareChannel(value: string): value is ShareChannel {
  return CHANNEL_OPTIONS.some((option) => option.value === value);
}

type Props = {
  username: string;
  walletAddress: string | null;
  projectId: string | null;
  onLogged?: () => void;
};

export function ShareExecutionLogCard(props: Props) {
  const [channel, setChannel] = useState<ShareChannel>("x");
  const [postedUrl, setPostedUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<WorkspaceActionNotice | null>(null);

  async function handleSubmit(): Promise<void> {
    setSaving(true);
    setFeedback(null);

    const result = await postGrowthEvent({
      event: "share_post_logged",
      username: props.username,
      walletAddress: props.walletAddress,
      projectId: props.projectId,
      metadata: {
        channel,
        postedUrl: postedUrl.trim() || null,
        memo: memo.trim() || null,
      },
    });

    if (!result.ok) {
      setSaving(false);
      setFeedback(
        mapWorkspaceActionError(result.error, "投稿記録の保存に失敗しました。")
      );
      return;
    }

    setSaving(false);
    setFeedback(buildWorkspaceActionSuccessNotice("shareLogSaved"));
    setPostedUrl("");
    setMemo("");
    props.onLogged?.();
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void handleSubmit();
  }

  return (
    <section
      id="share-log"
      className="surface-card scroll-mt-24 p-5 sm:p-6"
    >
      <form onSubmit={handleFormSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
              Share Log
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
              投稿したら記録する
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              実際にどこへシェアしたかを残しておくと、初回支援までの詰まりをあとで見返しやすくなります。
            </p>
          </div>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "保存中..." : "投稿記録を保存"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[0.7fr,1.3fr]">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-subtle)]">
              チャンネル
            </span>
            <select
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              value={channel}
              onChange={(event) => {
                const nextChannel = event.target.value;
                if (isShareChannel(nextChannel)) {
                  setChannel(nextChannel);
                }
              }}
            >
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-subtle)]">
              投稿 URL（任意）
            </span>
            <input
              type="url"
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder="https://..."
              value={postedUrl}
              onChange={(event) => {
                setPostedUrl(event.target.value);
              }}
            />
          </label>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs font-medium text-[var(--text-subtle)]">
            メモ（任意）
          </span>
          <textarea
            rows={3}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="公開直後の投稿、ストーリーのみ、英語版も同時投稿 など"
            value={memo}
            onChange={(event) => {
              setMemo(event.target.value);
            }}
          />
        </label>

        {feedback ? (
          <div className="mt-3">
            <WorkspaceStatusNotice
              tone={feedback.tone}
              title={feedback.title}
              description={feedback.description}
            />
          </div>
        ) : null}
      </form>
    </section>
  );
}
