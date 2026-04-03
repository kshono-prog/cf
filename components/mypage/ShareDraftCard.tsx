"use client";

import { useMemo, useState } from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import {
  parseShareDraftResult,
  type ShareDraftProgressInput,
  type ShareDraftResult,
} from "@/lib/ai/shareDraft";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";

type Props = {
  displayName: string;
  username: string;
  profile: string | null;
  goalTitle: string | null;
  projectTitle: string | null;
  projectDescription: string | null;
  publicPageUrl: string;
  progress: ShareDraftProgressInput | null;
  onGenerated?: (drafts: ShareDraftResult) => void;
  onCopied?: (channel: keyof ShareDraftResult) => void;
};

type ApiOk = {
  ok: true;
  drafts: ShareDraftResult;
};

const DRAFT_FIELDS: Array<{
  key: keyof ShareDraftResult;
  label: string;
}> = [
  { key: "xShort", label: "X用短文" },
  { key: "xLong", label: "X用長文" },
  { key: "instagramCaption", label: "Instagram用" },
  { key: "storyShort", label: "Story用短文" },
  { key: "simpleEnglish", label: "英語版" },
  { key: "launchMessage", label: "公開告知" },
  { key: "progressUpdateMessage", label: "進捗共有" },
];

export function ShareDraftCard(props: Props) {
  const [drafts, setDrafts] = useState<ShareDraftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<WorkspaceActionNotice | null>(null);
  const [copiedKey, setCopiedKey] = useState<keyof ShareDraftResult | null>(null);

  const canGenerate = useMemo(
    () => props.publicPageUrl.trim().length > 0 && props.displayName.trim().length > 0,
    [props.displayName, props.publicPageUrl]
  );

  async function handleGenerate(): Promise<void> {
    if (!canGenerate) {
      setFeedback(
        mapWorkspaceActionError(
          "SHARE_DRAFT_MISSING_CONTEXT",
          "公開ページ URL と表示名が必要です。"
        )
      );
      return;
    }

    setLoading(true);
    setFeedback(null);
    setCopiedKey(null);

    try {
      const response = await fetch("/api/ai/share-drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: props.displayName,
          username: props.username,
          profile: props.profile,
          goalTitle: props.goalTitle,
          projectTitle: props.projectTitle,
          projectDescription: props.projectDescription,
          publicPageUrl: props.publicPageUrl,
          progress: props.progress,
        }),
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok || !json || typeof json !== "object" || !("ok" in json)) {
        throw new Error("SHARE_DRAFT_REQUEST_FAILED");
      }

      if ((json as { ok: boolean }).ok !== true) {
        throw new Error("error" in json ? String((json as { error: unknown }).error) : "SHARE_DRAFT_REQUEST_FAILED");
      }

      const parsed = parseShareDraftResult((json as ApiOk).drafts);
      if (!parsed) {
        throw new Error("SHARE_DRAFT_RESPONSE_INVALID");
      }

      setDrafts(parsed);
      setFeedback(buildWorkspaceActionSuccessNotice("shareDraftGenerated"));
      props.onGenerated?.(parsed);
    } catch (nextError) {
      setFeedback(
        mapWorkspaceActionError(
          nextError instanceof Error
            ? nextError.message
            : "SHARE_DRAFT_REQUEST_FAILED",
          "拡散文面の生成に失敗しました。"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: keyof ShareDraftResult): Promise<void> {
    if (!drafts) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (typeof window.navigator.clipboard?.writeText !== "function") {
      setFeedback(
        mapWorkspaceActionError(
          "CLIPBOARD_UNAVAILABLE",
          "この環境ではコピーできません。"
        )
      );
      return;
    }

    try {
      await window.navigator.clipboard.writeText(drafts[key]);
      setCopiedKey(key);
      setFeedback({
        tone: "success",
        title: `${DRAFT_FIELDS.find((field) => field.key === key)?.label ?? "文面"}をコピーしました。`,
        description: "そのまま SNS 投稿やメモに貼り付けられます。",
      });
      props.onCopied?.(key);
    } catch {
      setFeedback(
        mapWorkspaceActionError("COPY_FAILED", "コピーに失敗しました。")
      );
    }
  }

  return (
    <section
      id="growth-share"
      className="surface-card scroll-mt-24 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Growth Share
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
            公開ページを広める文面
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            公開直後にそのまま使える SNS 文面をまとめて生成します。
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => void handleGenerate()}
          disabled={loading}
        >
          {loading ? "生成中..." : "文面を生成する"}
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-subtle)]">
        公開ページ URL:{" "}
        <a
          href={props.publicPageUrl}
          className="font-medium text-sky-700 underline"
          target="_blank"
          rel="noreferrer"
        >
          {props.publicPageUrl}
        </a>
      </div>

      {feedback ? (
        <div className="mt-3">
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        </div>
      ) : null}

      {drafts ? (
        <div className="mt-4 space-y-3">
          {DRAFT_FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-2xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-base font-semibold text-[var(--text)]">
                  {field.label}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void handleCopy(field.key)}
                >
                  {copiedKey === field.key ? "コピー済み" : "コピー"}
                </button>
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm leading-6 text-[var(--text)]">
                {drafts[field.key]}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
