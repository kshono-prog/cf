"use client";

import Image from "next/image";
import { Avatar } from "@/components/shared/Avatar";
import {
  SOCIAL_ICON_CONFIG,
  type CreatorProfile,
  type SocialKey,
} from "@/lib/profileTypes";

type ProfileHeaderProps = {
  username: string;
  creator: CreatorProfile;
  headerColor: string;
};

/** 表示用イニシャル生成 */
function initials(name?: string, username?: string): string {
  const src = (name || username || "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  const head = (parts[0]?.[0] || "").toUpperCase();
  const tail = (parts[1]?.[0] || "").toUpperCase();
  return (head + tail).slice(0, 2) || head || "?";
}

export function ProfileHeader({
  username,
  creator,
  headerColor,
}: ProfileHeaderProps) {
  const displayName = creator.displayName || username;

  return (
    <>
      {/* ヘッダー背景 */}
      <div
        className="h-20 sm:h-28 w-full"
        style={{
          backgroundColor: headerColor,
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.18), transparent 40%)",
        }}
      />

      {/* メインヘッダー */}
      <div className="px-6 pb-5 -mt-10 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative">
          <div className="rounded-full ring-4 ring-white bg-white p-1">
            <Avatar
              src={creator.avatarUrl}
              alt={`${displayName} のアイコン / Avatar`}
              fallbackText={initials(creator.displayName, username)}
              size={96}
            />
          </div>
        </div>

        {/* 名前 */}
        <h2 className="mt-3 text-lg sm:text-xl font-semibold text-gray-900">
          {displayName}
        </h2>

        {/* プロフィール文 */}
        {creator.profile && (
          <p className="mt-1 text-sm text-gray-600 leading-snug max-w-[28rem]">
            {creator.profile}
          </p>
        )}

        {/* SNS アイコン */}
        {creator.socials && (
          <div className="mt-3 flex items-center gap-4 justify-center">
            {SOCIAL_ICON_CONFIG.map(({ key, icon, label }) => {
              const socialKey: SocialKey = key;
              const url = creator.socials?.[socialKey];
              if (!url) return null;

              return (
                <a
                  key={socialKey}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-600 hover:text-gray-900 transition"
                >
                  <Image src={icon} alt={label} width={22} height={22} />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
