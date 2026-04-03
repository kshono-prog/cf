"use client";

import React from "react";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import {
  POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
  buildProposePostingComposeHandoff,
} from "@/components/mypage/postingComposeHandoff";
import {
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";

type Props = {
  projectId: string | null;
  displayName: string;
  username: string;
  publicPageUrl: string;
  onClose: () => void;
  onComplete: (feedback: { message: string; growthLabel: string }) => void;
};

const TEMPLATE_LINES = [
  "今日の近況です。",
  "",
  "（今取り組んでいることや進捗を1〜2文で書いてみてください）",
  "",
  "引き続きよろしくお願いします！",
];

export function AiManagerInlinePostingPanel({
  projectId,
  displayName,
  username,
  publicPageUrl,
  onClose,
  onComplete,
}: Props) {
  const [draftText, setDraftText] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);

  async function handleAiDraft() {
    setAiLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/share-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          profile: null,
          goalTitle: null,
          projectTitle: null,
          projectDescription: null,
          publicPageUrl,
          progress: null,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (
        json &&
        typeof json === "object" &&
        "ok" in json &&
        json.ok === true &&
        "drafts" in json &&
        json.drafts &&
        typeof json.drafts === "object" &&
        "progressUpdateMessage" in json.drafts &&
        typeof json.drafts.progressUpdateMessage === "string"
      ) {
        setDraftText(json.drafts.progressUpdateMessage);
      } else {
        setFeedback(
          mapWorkspaceActionError(
            "SHARE_DRAFT_REQUEST_FAILED",
            "AI 下書きを取得できませんでした。手動で入力してください。"
          )
        );
      }
    } catch {
      setFeedback(
        mapWorkspaceActionError(
          "SHARE_DRAFT_REQUEST_FAILED",
          "AI 下書きを取得できませんでした。手動で入力してください。"
        )
      );
    } finally {
      setAiLoading(false);
    }
  }

  function handleUseTemplate() {
    setDraftText(TEMPLATE_LINES.join("\n"));
  }

  function handleSendToCompose() {
    if (!draftText.trim()) {
      setFeedback(
        mapWorkspaceActionError(
          "POST_DRAFT_REQUIRED",
          "投稿文を入力してください。"
        )
      );
      return;
    }
    const handoff = buildProposePostingComposeHandoff({
      projectId,
      proposalText: draftText.trim(),
    });
    try {
      localStorage.setItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    } catch {
      setFeedback(
        mapWorkspaceActionError(
          "COMPOSE_HANDOFF_FAILED",
          "Compose への引き渡しに失敗しました。"
        )
      );
      return;
    }
    onComplete({ message: "Compose に下書きを送りました", growthLabel: "成長 +3%" });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-subtle)] leading-5">
        今の近況や進捗を書いて、投稿 Compose へ引き渡します。AI が下書きを提案することもできます。
      </p>

      <textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        rows={6}
        placeholder={"今日の近況や進捗を1〜3文で書いてみてください。"}
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
          disabled={aiLoading}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {aiLoading ? "生成中..." : "AI 下書きを生成"}
        </button>
        {!draftText && (
          <button
            type="button"
            onClick={handleUseTemplate}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            テンプレを使う
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSendToCompose}
            disabled={!draftText.trim()}
            className="btn text-xs py-1.5 px-4"
          >
            Compose に送る
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-subtle)]">
        「Compose に送る」を押すと投稿フォームに下書きが読み込まれます。
      </p>
    </div>
  );
}
