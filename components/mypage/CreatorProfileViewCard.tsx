// components/mypage/CreatorProfileViewCard.tsx
"use client";

import React from "react";
import type { SocialLinks, YoutubeVideo } from "@/types/creator";

type Props = {
  displayName: string;
  profile: string;
  avatarUrl: string;
  themeColor: string;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  onEdit: () => void;
};

export function CreatorProfileViewCard({
  displayName,
  profile,
  avatarUrl,
  themeColor,
  socials,
  youtubeVideos,
  onEdit,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">プロフィール</div>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          onClick={onEdit}
          style={{
            borderColor: themeColor || undefined,
            color: themeColor || undefined,
          }}
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
            className="h-12 w-12 rounded-full object-cover border"
          />
        ) : (
          <div className="h-12 w-12 rounded-full border bg-gray-100" />
        )}

        <div>
          <div className="text-sm font-semibold">
            {displayName || "（未設定）"}
          </div>
          <div className="text-xs text-gray-500 whitespace-pre-wrap">
            {profile || "（未設定）"}
          </div>
        </div>
      </div>

      {/* socials（存在してもしなくても表示は壊さない） */}
      <div className="text-xs text-gray-600 space-y-1">
        {socials.website ? <div>Website: {socials.website}</div> : null}
        {socials.twitter ? <div>X(Twitter): {socials.twitter}</div> : null}
        {socials.instagram ? <div>Instagram: {socials.instagram}</div> : null}
        {socials.youtube ? <div>YouTube: {socials.youtube}</div> : null}
        {socials.tiktok ? <div>TikTok: {socials.tiktok}</div> : null}
        {socials.facebook ? <div>Facebook: {socials.facebook}</div> : null}
      </div>

      {/* youtubeVideos（必要なら一覧表示。不要なら丸ごと削除OK） */}
      {youtubeVideos.length > 0 && youtubeVideos.some((v) => v.url.trim()) ? (
        <div className="pt-2 border-t">
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Featured Videos
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
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
