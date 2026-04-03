"use client";

import React from "react";
import type { Address } from "viem";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { saveMyPageUser } from "@/lib/mypage/profileApi";
import { trackGrowthEvent } from "@/lib/growth/client";
import {
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";

type Props = {
  address: Address;
  username: string;
  displayName: string;
  existingProfile: string;
  onClose: () => void;
  onComplete: (feedback: { message: string; growthLabel: string }) => void;
};

export function AiManagerInlineProfileEditPanel({
  address,
  username,
  displayName,
  existingProfile,
  onClose,
  onComplete,
}: Props) {
  const [bioText, setBioText] = React.useState(existingProfile);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);

  async function handleAiDraft() {
    setAiLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/profile-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          freeText: bioText || "活動内容から自然な紹介文を1文で提案してください。",
          existingDisplayName: displayName,
          existingProfile: bioText,
          existingGoalTitle: null,
          existingSocials: {},
          existingYoutubeVideos: [],
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (
        json &&
        typeof json === "object" &&
        "ok" in json &&
        json.ok === true &&
        "draft" in json &&
        json.draft &&
        typeof json.draft === "object" &&
        "profile" in json.draft &&
        typeof json.draft.profile === "string"
      ) {
        setBioText(json.draft.profile);
      } else {
        setFeedback(
          mapWorkspaceActionError(
            "PROFILE_DRAFT_REQUEST_FAILED",
            "AI 下書きの生成に失敗しました。手動で入力してください。"
          )
        );
      }
    } catch {
      setFeedback(
        mapWorkspaceActionError(
          "PROFILE_DRAFT_REQUEST_FAILED",
          "AI 下書きの生成に失敗しました。手動で入力してください。"
        )
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!bioText.trim()) {
      setFeedback(
        mapWorkspaceActionError(
          "PROFILE_BIO_REQUIRED",
          "紹介文を入力してください。"
        )
      );
      return;
    }
    setSaveLoading(true);
    setFeedback(null);
    try {
      const result = await saveMyPageUser({
        apiBase: "",
        address,
        username,
        displayName,
        profile: bioText.trim(),
      });
      if (!result.ok) {
        setFeedback(
          mapWorkspaceActionError(
            result.error,
            "保存に失敗しました。設定画面から再度お試しください。"
          )
        );
        return;
      }
      trackGrowthEvent({ event: "profile_saved", username, walletAddress: address });
      onComplete({ message: "プロフィールを更新しました", growthLabel: "信頼度 +5%" });
    } catch {
      setFeedback(
        mapWorkspaceActionError(
          "USER_SAVE_FAILED",
          "保存に失敗しました。設定画面から再度お試しください。"
        )
      );
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-subtle)] leading-5">
        紹介文を書いて、支援者への第一印象を整えましょう。AI が下書きを提案することもできます。
      </p>

      <textarea
        value={bioText}
        onChange={(e) => setBioText(e.target.value)}
        rows={4}
        placeholder="例: 音楽活動を続けながら、応援してくれる人と一緒に新作を作っています。"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--text)] resize-none"
      />

      {feedback ? (
        <WorkspaceStatusNotice
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAiDraft}
          disabled={aiLoading || saveLoading}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {aiLoading ? "生成中..." : "AI 下書きを生成"}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saveLoading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveLoading || aiLoading || !bioText.trim()}
            className="btn text-xs py-1.5 px-4"
          >
            {saveLoading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
