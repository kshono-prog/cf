// app/[username]/ProfileClientWrapper.tsx
"use client";

import { useEffect, useState } from "react";
import ProfileClient from "@/components/ProfileClient";

// ---- 型（ProfileClient に渡す形に寄せる） ----
type SocialLinks = Partial<
  Record<
    "twitter" | "instagram" | "youtube" | "facebook" | "tiktok" | "website",
    string
  >
>;

type YoutubeVideo = {
  url: string;
  title: string;
  description: string;
};

export type CreatorProfile = {
  username: string;
  address?: string;
  displayName?: string;
  avatarUrl?: string | null;
  profile?: string | null;
  qrcode?: string | null;
  url?: string | null;
  goalTitle?: string | null;
  goalTargetJpyc?: number | null;
  themeColor?: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
};

// creators API が projectId を返す場合だけ拾う
type CreatorWithProject = CreatorProfile & {
  projectId?: string | null;
};

const API_BASE = "";

// ---- runtime guards ----
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function toNullOrString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toNullOrNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toSocialLinks(v: unknown): SocialLinks | undefined {
  if (!isRecord(v)) return undefined;

  const out: SocialLinks = {};
  const keys: Array<keyof SocialLinks> = [
    "twitter",
    "instagram",
    "youtube",
    "facebook",
    "tiktok",
    "website",
  ];

  for (const k of keys) {
    const val = v[k];
    if (typeof val === "string" && val.length > 0) out[k] = val;
  }

  return out;
}

function toYoutubeVideos(v: unknown): YoutubeVideo[] | undefined {
  if (!Array.isArray(v)) return undefined;

  const out: YoutubeVideo[] = [];
  for (const item of v) {
    if (!isRecord(item)) continue;
    const url = toOptionalString(item.url);
    const title = toOptionalString(item.title);
    const description = toOptionalString(item.description);

    if (!url || !title || !description) continue;

    out.push({ url, title, description });
  }
  return out;
}

function parseCreatorApiToCreatorProfile(raw: unknown): CreatorWithProject {
  if (!isRecord(raw)) throw new Error("CREATOR_INVALID");

  const username = toOptionalString(raw.username);
  const displayName = toOptionalString(raw.displayName);

  if (!username) throw new Error("USERNAME_INVALID");
  if (!displayName) throw new Error("DISPLAY_NAME_INVALID");

  // API仕様（あなたの page.tsx の CreatorApiResponse）に合わせて吸う
  const profileText = toNullOrString(raw.profileText);
  const avatar = toNullOrString(raw.avatar);
  const qrcode = toNullOrString(raw.qrcode);
  const url = toNullOrString(raw.url);

  const goalTitle = toNullOrString(raw.goalTitle);
  const goalTargetJpyc = toNullOrNumber(raw.goalTargetJpyc);

  const themeColor = toNullOrString(raw.themeColor);
  const address = toNullOrString(raw.address);

  const socials = toSocialLinks(raw.socials);
  const youtubeVideos = toYoutubeVideos(raw.youtubeVideos);

  // projectId は creators API が返せるなら拾う（無ければ null）
  const projectId = toNullOrString(raw.projectId);

  return {
    username,
    displayName,
    address: address ?? undefined,
    avatarUrl: avatar,
    profile: profileText,
    qrcode,
    url,
    goalTitle,
    goalTargetJpyc,
    themeColor,
    socials,
    youtubeVideos,
    projectId,
  };
}

export default function ProfileClientWrapper({
  username,
}: {
  username: string;
}) {
  const [creator, setCreator] = useState<CreatorWithProject | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCreator(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/creators/${encodeURIComponent(username)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          if (!cancelled) {
            setError("not-found");
            setCreator(null);
            setProjectId(null);
          }
          return;
        }

        const data = (await res.json().catch(() => null)) as unknown;
        const parsed = parseCreatorApiToCreatorProfile(data);

        if (!cancelled) {
          setCreator(parsed);
          setProjectId(parsed.projectId ?? null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "network");
          setCreator(null);
          setProjectId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchCreator();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 text-sm">
        読み込み中です…
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-lg font-semibold mb-2">
          ページが見つかりませんでした
        </p>
        <p className="text-sm text-gray-500">
          クリエイター情報が登録されていない可能性があります。
        </p>
      </div>
    );
  }

  return (
    <ProfileClient
      username={username}
      creator={creator}
      projectId={projectId}
    />
  );
}
