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

  avatarUrl: string;
  themeColor: string;
  creatorType: CreatorProfile["creatorType"];

  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];

  avatarFile: File | null;
  avatarPreview: string | null;

  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;
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
  avatarUrl,
  themeColor,
  creatorType,
  socials,
  youtubeVideos,
  avatarFile,
  avatarPreview,
  setDisplayName,
  setProfile,
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
    <form className="card p-4 space-y-3 bg-white" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold mb-1">プロフィールの編集</h2>

      <div>
        <label className="block text-xs font-medium mb-1">
          表示名 <span className="text-red-500">*</span>
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
        <label className="block text-xs font-medium mb-1">プロフィール</label>
        <textarea
          className="input min-h-[80px]"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">
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
        <label className="block text-xs font-medium mb-1">テーマカラー</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            className="h-8 w-10 rounded border"
            value={themeColor || "#005bbb"}
            onChange={(e) => setThemeColor(e.target.value)}
            disabled={saving}
          />
          <input
            type="text"
            className="input flex-1"
            placeholder="#005bbb"
            value={themeColor ?? ""}
            onChange={(e) => setThemeColor(e.target.value)}
            disabled={saving}
          />
        </div>
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

      <EventManager
        username={username}
        themeColor={themeColor}
        baseUrl={baseUrl}
      />

      {extraSections ? (
        <div className="pt-2">
          <div className="h-px w-full bg-gray-200" />
          <div className="pt-3 space-y-3">{extraSections}</div>
        </div>
      ) : null}

      <div className="flex gap-2 mt-2">
        <button type="submit" className="btn flex-1" disabled={saving}>
          {saving ? "保存中..." : "保存する"}
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
