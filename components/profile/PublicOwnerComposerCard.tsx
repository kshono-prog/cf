"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Address } from "viem";

import { createSnsPost } from "@/lib/mypage/snsApi";

type ProjectOption = {
  id: string;
  label: string;
};

type Props = {
  address: Address;
  managementHref: string;
  projectOptions: ProjectOption[];
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

export function PublicOwnerComposerCard(props: Props) {
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState("");
  const [mediaType, setMediaType] = useState<"" | "IMAGE" | "VIDEO" | "LINK">(
    ""
  );
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaFields, setShowMediaFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedLength = useMemo(() => body.trim().length, [body]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const trimmedBody = body.trim();
    const trimmedMediaUrl = mediaUrl.trim();
    if (!trimmedBody) {
      setError("投稿本文を入力してください。");
      return;
    }
    if (trimmedBody.length > 2000) {
      setError("投稿本文は 2000 文字以内で入力してください。");
      return;
    }
    if (mediaType && !trimmedMediaUrl) {
      setError("メディア URL を入力してください。");
      return;
    }
    if (!mediaType && trimmedMediaUrl) {
      setError("メディア種別を選んでください。");
      return;
    }
    if (trimmedMediaUrl && !isHttpUrl(trimmedMediaUrl)) {
      setError("メディア URL は http(s) 形式で入力してください。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createSnsPost({
      address: props.address,
      body: trimmedBody,
      mediaType: mediaType || null,
      mediaUrl: mediaType ? trimmedMediaUrl : null,
      projectId: projectId || null,
    });

    if (!result.ok) {
      setError(
        result.error === "PROJECT_NOT_FOUND_OR_FORBIDDEN"
          ? "応援先の設定を確認してください。"
          : result.error === "MEDIA_FIELDS_MISMATCH"
          ? "メディア種別と URL をそろえて入力してください。"
          : "投稿の公開に失敗しました。"
      );
      setSaving(false);
      return;
    }

    setBody("");
    setProjectId("");
    setMediaType("");
    setMediaUrl("");
    setShowMediaFields(false);
    setSuccess("投稿を公開しました。タイムラインに反映されます。");
    setSaving(false);
    props.onCreated();
  }

  return (
    <section
      id="owner-composer"
      className="mt-4 overflow-hidden bg-white"
    >
      <div className="space-y-3.5 p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] text-gray-500">
              自分の操作
            </div>
            <h3 className="mt-1.5 text-[17px] font-semibold text-gray-900 sm:text-lg">
              今の進捗をここから投稿
            </h3>
            <p className="mt-1.5 text-[13px] leading-6 text-gray-600">
              公開ページを見ながら、そのまま近況や支援のお礼を投稿できます。
            </p>
          </div>
          <Link
            href={props.managementHref}
            className="rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-[11px] font-medium text-gray-800 transition hover:border-gray-400"
          >
            設定を開く
          </Link>
        </div>

        <form className="space-y-2.5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-gray-700">本文</label>
            <textarea
              className="input mt-1 min-h-[120px]"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="今日の進捗、次に進めたいこと、支援へのお礼を書けます。"
              disabled={saving}
            />
            <div className="mt-1 text-[10px] text-gray-500">
              {trimmedLength}/2000
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr),auto]">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                応援のひもづけ
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
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-[11px] font-medium text-gray-800 transition hover:border-gray-400"
                onClick={() => setShowMediaFields((current) => !current)}
                disabled={saving}
              >
                {showMediaFields ? "添付を閉じる" : "画像・リンクを追加"}
              </button>
            </div>
          </div>

          {showMediaFields ? (
            <div className="grid gap-2.5 md:grid-cols-2">
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
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] leading-5 text-gray-500">
              投稿は公開状態で作成され、プロフィールと投稿一覧に反映されます。
            </div>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "投稿中..." : "投稿する"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
