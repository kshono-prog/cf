// components/mypage/CreatorProfileViewCard.tsx
"use client";

import React from "react";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import { CREATOR_TYPE_LABELS } from "@/lib/creatorTaxonomy";

type Props = {
  displayName: string;
  profile: string;
  avatarUrl: string;
  externalUrl: string;
  themeColor: string;
  creatorType: CreatorProfile["creatorType"];
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  onEdit: () => void;
};

export function CreatorProfileViewCard({
  displayName,
  profile,
  avatarUrl,
  externalUrl,
  themeColor,
  creatorType,
  socials,
  youtubeVideos,
  onEdit,
}: Props) {
  return (
    <div className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--text)]">
            プロフィール
          </div>
          <div className="mt-1 text-sm text-[var(--text-subtle)]">
            公開される見た目の簡易プレビューです。
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={onEdit}
        >
          編集
        </button>
      </div>

      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="avatar"
            className="h-14 w-14 rounded-full border border-[var(--line)] object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)]" />
        )}

        <div>
          <div className="text-base font-semibold text-[var(--text)]">
            {displayName || "（未設定）"}
          </div>
          <div className="mt-1 text-sm whitespace-pre-wrap text-[var(--text-subtle)]">
            {profile || "（未設定）"}
          </div>
        </div>
      </div>

      {creatorType ? (
        <div className="surface-subtle space-y-2 p-3">
          <div className="text-sm text-[var(--text)]">
            種類: {CREATOR_TYPE_LABELS[creatorType]}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface-subtle p-3 text-sm text-[var(--text-subtle)]">
          <div className="font-medium text-[var(--text)]">外部リンク</div>
          <div className="mt-2 break-all">{externalUrl || "未設定"}</div>
        </div>
        <div className="surface-subtle p-3 text-sm text-[var(--text-subtle)]">
          <div className="font-medium text-[var(--text)]">背景トーン</div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border border-[var(--line)]"
              style={{ backgroundColor: themeColor || "#f0f1f4" }}
            />
            {themeColor || "未設定"}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm text-[var(--text-subtle)]">
        {socials.website ? <div>Web: {socials.website}</div> : null}
        {socials.twitter ? <div>X: {socials.twitter}</div> : null}
        {socials.instagram ? <div>Instagram: {socials.instagram}</div> : null}
        {socials.youtube ? <div>YouTube: {socials.youtube}</div> : null}
        {socials.tiktok ? <div>TikTok: {socials.tiktok}</div> : null}
        {socials.facebook ? <div>Facebook: {socials.facebook}</div> : null}
      </div>

      {youtubeVideos.length > 0 && youtubeVideos.some((v) => v.url.trim()) ? (
        <div className="border-t border-[var(--line)] pt-4">
          <div className="text-sm font-semibold text-[var(--text)]">
            紹介動画
          </div>
          <ul className="mt-2 space-y-1 text-sm text-[var(--text-subtle)]">
            {youtubeVideos
              .filter((v) => v.url.trim())
              .slice(0, 3)
              .map((v, i) => (
                <li key={i} className="break-all">
                  {v.title?.trim() ? `${v.title}: ` : ""}
                  {v.url}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
