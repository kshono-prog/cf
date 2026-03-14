// components/mypage/CreatorProfileEditForm.tsx
"use client";

import React from "react";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import {
  CREATOR_TYPE_LABELS,
  CREATOR_TYPE_OPTIONS,
  isCreatorType,
} from "@/lib/creatorTaxonomy";
import { AvatarUploader } from "./AvatarUploader";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { YoutubeVideosEditor } from "./YoutubeVideosEditor";
import EventManager from "@/components/EventManager";
type Props = {
  username: string;
  displayName: string;
  profile: string;
  externalUrl: string;

  avatarUrl: string;
  themeColor: string;
  creatorType: CreatorProfile["creatorType"];

  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];

  avatarFile: File | null;
  avatarPreview: string | null;

  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;
  setExternalUrl: (v: string) => void;
  setThemeColor: (v: string) => void;
  setCreatorType: (v: CreatorProfile["creatorType"]) => void;

  setSocials: (v: SocialLinks) => void;
  setYoutubeVideos: (v: YoutubeVideo[]) => void;

  setAvatarFile: (v: File | null) => void;
  setAvatarPreview: (v: string | null) => void;

  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  baseUrl?: string;

  onAvatarPreviewRevoke?: (prevUrl: string) => void;

  /** ★ ここに Project / Goal / Summary 入力UIを差し込む */
  extraSections?: React.ReactNode;
};

export function CreatorProfileEditForm({
  username,
  displayName,
  profile,
  externalUrl,
  avatarUrl,
  themeColor,
  creatorType,
  socials,
  youtubeVideos,
  avatarFile,
  avatarPreview,
  setDisplayName,
  setProfile,
  setExternalUrl,
  setThemeColor,
  setCreatorType,
  setSocials,
  setYoutubeVideos,
  setAvatarFile,
  setAvatarPreview,
  saving,
  onSubmit,
  onCancel,
  baseUrl = "",
  onAvatarPreviewRevoke,
  extraSections,
}: Props) {
  return (
    <form className="surface-card space-y-5 p-5 sm:p-6" onSubmit={onSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          基本情報と公開ページを編集
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          名前や紹介文、公開ページに出すリンクをまとめて整えます。
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">基本情報</div>
          <p className="mt-1 text-sm text-[var(--text-subtle)]">
            表示名、ユーザー名、紹介文、アイコン、背景トーンを整えます。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text)]">
              名前
            </label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text)]">
              ユーザー名
            </label>
            <input type="text" className="input" value={username} disabled />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            紹介文
          </label>
          <textarea
            className="input min-h-[120px]"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            disabled={saving}
          />
        </div>

        <AvatarUploader
          avatarUrl={avatarUrl}
          avatarPreview={avatarPreview}
          avatarFile={avatarFile}
          disabled={saving}
          onSelectFile={(file, previewUrl) => {
            if (avatarPreview && onAvatarPreviewRevoke) {
              onAvatarPreviewRevoke(avatarPreview);
            }
            setAvatarFile(file);
            setAvatarPreview(previewUrl);
          }}
          onClearFile={() => {
            if (avatarPreview && onAvatarPreviewRevoke) {
              onAvatarPreviewRevoke(avatarPreview);
            }
            setAvatarFile(null);
            setAvatarPreview(null);
          }}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            背景トーン
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-11 w-14 rounded-xl border border-[var(--line)] bg-white"
              value={themeColor || "#2563eb"}
              onChange={(e) => setThemeColor(e.target.value)}
              disabled={saving}
            />
            <input
              type="text"
              className="input flex-1"
              placeholder="#2563eb"
              value={themeColor ?? ""}
              onChange={(e) => setThemeColor(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-4">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">公開ページ</div>
          <p className="mt-1 text-sm text-[var(--text-subtle)]">
            応援導線、外部リンク、SNSリンク、紹介動画をまとめて整えます。
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            外部リンク
          </label>
          <input
            type="url"
            className="input"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={saving}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            クリエイターの種類
          </label>
          <select
            className="input"
            value={creatorType ?? ""}
            onChange={(e) => {
              const nextValue = e.target.value;
              setCreatorType(
                nextValue === ""
                  ? null
                  : isCreatorType(nextValue)
                  ? nextValue
                  : null
              );
            }}
            disabled={saving}
          >
            <option value="">未設定</option>
            {CREATOR_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CREATOR_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <SocialLinksEditor
          socials={socials}
          onChange={setSocials}
          disabled={saving}
        />

        <YoutubeVideosEditor
          youtubeVideos={youtubeVideos}
          onChange={setYoutubeVideos}
          disabled={saving}
        />
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <div className="text-base font-semibold text-[var(--text)]">
          イベント
        </div>
        <p className="mt-1 text-sm text-[var(--text-subtle)]">
          必要なときだけ、公開イベントや開催情報を追加できます。
        </p>
        <div className="mt-4">
          <EventManager
            username={username}
            themeColor={themeColor}
            baseUrl={baseUrl}
          />
        </div>
      </div>

      {extraSections ? (
        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="text-base font-semibold text-[var(--text)]">
            詳細な設定
          </div>
          <div className="space-y-3">{extraSections}</div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn flex-1" disabled={saving}>
          {saving ? "保存中です" : "保存する"}
        </button>
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
