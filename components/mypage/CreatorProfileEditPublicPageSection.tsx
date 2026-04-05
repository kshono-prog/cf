"use client";

import {
  CREATOR_TYPE_LABELS,
  CREATOR_TYPE_OPTIONS,
  ECOSYSTEM_ROLE_LABELS,
  ECOSYSTEM_ROLE_OPTIONS,
  isCreatorType,
  isEcosystemRole,
} from "@/lib/creatorTaxonomy";
import { SocialLinksEditor } from "@/components/mypage/SocialLinksEditor";
import { YoutubeVideosEditor } from "@/components/mypage/YoutubeVideosEditor";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorProfileEditPublicPageSection() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div>
        <div className="text-base font-semibold text-[var(--text)]">
          公開ページ
        </div>
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
          value={workspace.externalUrl}
          onChange={(e) => workspace.setExternalUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={workspace.saving}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          クリエイターの種類
        </label>
        <select
          className="input"
          value={workspace.creatorType ?? ""}
          onChange={(e) => {
            const nextValue = e.target.value;
            workspace.setCreatorType(
              nextValue === ""
                ? null
                : isCreatorType(nextValue)
                  ? nextValue
                  : null
            );
          }}
          disabled={workspace.saving}
        >
          <option value="">未設定</option>
          {CREATOR_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CREATOR_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          エコシステムロール
        </label>
        <select
          className="input"
          value={workspace.ecosystemRole ?? ""}
          onChange={(e) => {
            const nextValue = e.target.value;
            workspace.setEcosystemRole(
              nextValue === ""
                ? null
                : isEcosystemRole(nextValue)
                  ? nextValue
                  : null
            );
          }}
          disabled={workspace.saving}
        >
          <option value="">未設定</option>
          {ECOSYSTEM_ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ECOSYSTEM_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--text-subtle)]">
          クリエイター・マネージャー・コラボレーターのいずれかを選択できます。
        </p>
      </div>

      <SocialLinksEditor
        socials={workspace.socials}
        onChange={workspace.setSocials}
        disabled={workspace.saving}
      />

      <YoutubeVideosEditor
        youtubeVideos={workspace.youtubeVideos}
        onChange={workspace.setYoutubeVideos}
        disabled={workspace.saving}
      />
    </div>
  );
}
