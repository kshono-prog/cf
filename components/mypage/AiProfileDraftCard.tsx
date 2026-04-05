"use client";

import { useState } from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import {
  parseProfileDraftResult,
  type ProfileDraftResult,
} from "@/lib/ai/profileDraft";
import {
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import type { SocialLinks, YoutubeVideo } from "@/types/creator";

type Props = {
  username: string | null;
  existingDisplayName: string;
  existingProfile: string;
  existingGoalTitle: string | null;
  existingSocials: SocialLinks;
  existingYoutubeVideos: YoutubeVideo[];
  onApply: (draft: ProfileDraftResult) => void;
  onGenerated?: (draft: ProfileDraftResult) => void;
};

type ApiOk = {
  ok: true;
  draft: ProfileDraftResult;
};

function formatJpy(value: number): string {
  return value.toLocaleString("ja-JP");
}

export function AiProfileDraftCard(props: Props) {
  const [freeText, setFreeText] = useState("");
  const [draft, setDraft] = useState<ProfileDraftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<WorkspaceActionNotice | null>(null);

  async function handleGenerate(): Promise<void> {
    const trimmed = freeText.trim();
    if (!trimmed) {
      setFeedback(
        mapWorkspaceActionError(
          "PROFILE_FREE_TEXT_REQUIRED",
          "活動内容を自由文で入力してください。"
        )
      );
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/ai/profile-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: props.username,
          freeText: trimmed,
          existingDisplayName: props.existingDisplayName || null,
          existingProfile: props.existingProfile || null,
          existingGoalTitle: props.existingGoalTitle,
          existingSocials: props.existingSocials,
          existingYoutubeVideos: props.existingYoutubeVideos,
        }),
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok || !json || typeof json !== "object" || !("ok" in json)) {
        throw new Error("PROFILE_DRAFT_REQUEST_FAILED");
      }

      if ((json as { ok: boolean }).ok !== true) {
        throw new Error("error" in json ? String((json as { error: unknown }).error) : "PROFILE_DRAFT_REQUEST_FAILED");
      }

      const parsed = parseProfileDraftResult((json as ApiOk).draft);
      if (!parsed) {
        throw new Error("PROFILE_DRAFT_RESPONSE_INVALID");
      }

      setDraft(parsed);
      props.onGenerated?.(parsed);
    } catch (nextError) {
      setFeedback(
        mapWorkspaceActionError(
          nextError instanceof Error
            ? nextError.message
            : "PROFILE_DRAFT_REQUEST_FAILED",
          "プロフィール下書きの生成に失敗しました。"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            AI Draft
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--text)]">
            AIでプロフィール下書きを作る
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            活動内容を自然文で入れると、プロフィール、最初の project、目標金額のたたき台をまとめて提案します。
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => void handleGenerate()}
          disabled={loading}
        >
          {loading ? "生成中..." : "下書きを生成"}
        </button>
      </div>

      <textarea
        className="input mt-4 min-h-[120px]"
        placeholder="例）週末にライブ活動をしています。自主企画の準備と配信機材を少しずつ整えたいです。初めて公開ページを作るので、やりたいことが伝わる紹介文もほしいです。"
        value={freeText}
        onChange={(event) => setFreeText(event.target.value)}
        disabled={loading}
      />

      {feedback ? (
        <div className="mt-3">
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        </div>
      ) : null}

      {draft ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/80 bg-[var(--surface)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="surface-subtle px-3 py-3">
              <div className="text-xs font-medium text-[var(--text-subtle)]">
                表示名
              </div>
              <div className="mt-1 text-sm text-[var(--text)]">{draft.displayName}</div>
            </div>
            <div className="surface-subtle px-3 py-3">
              <div className="text-xs font-medium text-[var(--text-subtle)]">
                目標金額たたき台
              </div>
              <div className="mt-1 text-sm text-[var(--text)]">
                {formatJpy(draft.suggestedGoalTargetJpyc)} JPYC
              </div>
            </div>
          </div>

          <div className="surface-subtle px-3 py-3">
            <div className="text-xs font-medium text-[var(--text-subtle)]">
              プロフィール文
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--text)]">
              {draft.profile}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="surface-subtle px-3 py-3">
              <div className="text-xs font-medium text-[var(--text-subtle)]">
                goal の言い方
              </div>
              <div className="mt-1 text-sm text-[var(--text)]">{draft.goalTitle}</div>
            </div>
            <div className="surface-subtle px-3 py-3">
              <div className="text-xs font-medium text-[var(--text-subtle)]">
                テーマカラー
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text)]">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-[var(--line)]"
                  style={{ backgroundColor: draft.suggestedThemeColor }}
                />
                {draft.suggestedThemeColor}
              </div>
            </div>
          </div>

          <div className="surface-subtle px-3 py-3">
            <div className="text-xs font-medium text-[var(--text-subtle)]">
              最初の project 案
            </div>
            <div className="mt-1 text-sm font-medium text-[var(--text)]">
              {draft.suggestedProjectTitle}
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--text)]">
              {draft.suggestedProjectDescription}
            </div>
          </div>

          {draft.suggestedSocialLinksNotes.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-[var(--text-subtle)]">
                SNS リンクの提案
              </div>
              <ul className="mt-1 space-y-1 text-sm text-[var(--text)]">
                {draft.suggestedSocialLinksNotes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                Warnings
              </div>
              <ul className="mt-1 space-y-1 text-sm text-amber-900">
                {draft.warnings.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn"
              onClick={() => props.onApply(draft)}
            >
              この下書きをフォームに反映
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
