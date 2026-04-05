"use client";

import React from "react";
import type { Address } from "viem";

import type { PostingProjectOption } from "@/lib/mypage/postingApi";
import { createPostingPost } from "@/lib/mypage/postingApi";
import {
  parsePostingComposeHandoff,
  POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
} from "@/components/mypage/postingComposeHandoff";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import { AI_OFFICE_LABEL } from "@/lib/uxCopy";

type Props = {
  address: Address | undefined;
  projectOptions: PostingProjectOption[];
  onCreated: () => void;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function PostComposerCard(props: Props) {
  const [body, setBody] = React.useState("");
  const [mediaType, setMediaType] = React.useState<"" | "IMAGE" | "VIDEO" | "LINK">(
    ""
  );
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [projectId, setProjectId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);
  const [handoffNotice, setHandoffNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawValue = window.localStorage.getItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      window.localStorage.removeItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY);
      return;
    }

    const handoff = parsePostingComposeHandoff(parsedValue);
    if (!handoff) {
      window.localStorage.removeItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY);
      return;
    }

    setBody((current) => (current.trim().length > 0 ? current : handoff.payloadText));
    setProjectId((current) => {
      if (current) {
        return current;
      }
      if (
        handoff.projectId &&
        props.projectOptions.some((option) => option.id === handoff.projectId)
      ) {
        return handoff.projectId;
      }
      return "";
    });
    setHandoffNotice(
      `${AI_OFFICE_LABEL}の告知文案を投稿欄に反映しました。内容を確認してから投稿してください。`
    );
    setFeedback(null);
    window.localStorage.removeItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY);
  }, [props.projectOptions]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    if (!props.address) {
      setFeedback(
        mapWorkspaceActionError(
          "WALLET_NOT_CONNECTED",
          "ウォレット接続を確認してから投稿してください。"
        )
      );
      return;
    }

    const trimmedBody = body.trim();
    const trimmedMediaUrl = mediaUrl.trim();
    if (!trimmedBody) {
      setFeedback(mapWorkspaceActionError("BODY_REQUIRED", "投稿本文を入力してください。"));
      return;
    }
    if (trimmedBody.length > 2000) {
      setFeedback(
        mapWorkspaceActionError(
          "BODY_TOO_LONG",
          "投稿本文は 2000 文字以内で入力してください。"
        )
      );
      return;
    }
    if (mediaType && !trimmedMediaUrl) {
      setFeedback(
        mapWorkspaceActionError(
          "MEDIA_FIELDS_MISMATCH",
          "メディア URL を入力してください。"
        )
      );
      return;
    }
    if (!mediaType && trimmedMediaUrl) {
      setFeedback(
        mapWorkspaceActionError(
          "MEDIA_TYPE_INVALID",
          "メディア種別を選んでください。"
        )
      );
      return;
    }
    if (trimmedMediaUrl && !isHttpUrl(trimmedMediaUrl)) {
      setFeedback(
        mapWorkspaceActionError(
          "MEDIA_URL_INVALID",
          "メディア URL は http(s) 形式で入力してください。"
        )
      );
      return;
    }

    setSaving(true);
    setFeedback(null);

    const result = await createPostingPost({
      address: props.address,
      body: trimmedBody,
      mediaType: mediaType || null,
      mediaUrl: mediaType ? trimmedMediaUrl : null,
      projectId: projectId || null,
    });

    if (!result.ok) {
      setFeedback(
        mapWorkspaceActionError(
          result.error,
          "投稿の作成に失敗しました。"
        )
      );
      setSaving(false);
      return;
    }

    setBody("");
    setMediaType("");
    setMediaUrl("");
    setHandoffNotice(null);
    setFeedback(buildWorkspaceActionSuccessNotice("postPublished"));
    setSaving(false);
    props.onCreated();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">投稿を作成</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            活動報告、進捗共有、次の支援導線をここから追加します。
          </div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          公開 feed 連携
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-gray-700">本文</label>
          <textarea
            className="input mt-1 min-h-[144px]"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="今日の進捗、次に進めたいこと、支援のお礼などを書けます。"
            disabled={saving}
          />
          <div className="mt-1 text-[11px] text-gray-500">
            {body.trim().length}/2000
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              project 紐づけ
            </label>
            <select
              className="input mt-1"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={saving}
            >
              <option value="">なし</option>
              {props.projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-gray-500">
              紐づけると公開ページの支援導線が分かりやすくなります。
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              メディア種別
            </label>
            <select
              className="input mt-1"
              value={mediaType}
              onChange={(event) =>
                setMediaType(
                  event.target.value as "" | "IMAGE" | "VIDEO" | "LINK"
                )
              }
              disabled={saving}
            >
              <option value="">なし</option>
              <option value="IMAGE">画像</option>
              <option value="VIDEO">動画リンク</option>
              <option value="LINK">外部リンク</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            メディア URL
          </label>
          <input
            type="url"
            className="input mt-1"
            value={mediaUrl}
            onChange={(event) => setMediaUrl(event.target.value)}
            placeholder="https://example.com/..."
            disabled={saving}
          />
        </div>

        {handoffNotice ? (
          <WorkspaceStatusNotice tone="info" title={handoffNotice} />
        ) : null}
        {feedback ? (
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] leading-5 text-gray-500">
            このフェーズでは作成した投稿は公開状態で保存されます。
          </div>
          <button type="submit" className="btn" disabled={saving || !props.address}>
            {saving ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </form>
    </div>
  );
}
