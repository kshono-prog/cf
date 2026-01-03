// ===============================
// 1) app/[username]/page.tsx 変更（追記＋ProfileClientへ渡す）
// ===============================

import ProfileClient from "@/components/ProfileClient";
import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { prisma } from "@/lib/prisma";

type Params = { username: string };

// ---- 型定義 ----
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

type CreatorApiResponse = {
  username: string;
  displayName: string;
  profileText: string | null;
  avatar: string | null;
  qrcode: string | null;
  url: string | null;
  goalTitle: string | null;
  goalTargetJpyc: number | null;
  themeColor: string | null;
  address: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
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

// ===== Public summary lite（/api/public/creator の要約）=====
type PublicSummaryLite = {
  goal: {
    targetAmountJpyc: number;
    achievedAt: string | null;
    deadline: string | null;
  } | null;
  progress: {
    confirmedJpyc: number;
    targetJpyc: number | null;
    progressPct: number;
  } | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickPublicSummaryLite(summary: unknown): PublicSummaryLite {
  if (!isRecord(summary)) return { goal: null, progress: null };

  const goalRaw = summary.goal;
  const progressRaw = summary.progress;

  const goal =
    isRecord(goalRaw) &&
    typeof goalRaw.targetAmountJpyc === "number" &&
    (typeof goalRaw.achievedAt === "string" || goalRaw.achievedAt === null) &&
    (typeof goalRaw.deadline === "string" || goalRaw.deadline === null)
      ? {
          targetAmountJpyc: goalRaw.targetAmountJpyc,
          achievedAt: goalRaw.achievedAt as string | null,
          deadline: goalRaw.deadline as string | null,
        }
      : null;

  const progress =
    isRecord(progressRaw) &&
    typeof progressRaw.confirmedJpyc === "number" &&
    (typeof progressRaw.targetJpyc === "number" ||
      progressRaw.targetJpyc === null) &&
    typeof progressRaw.progressPct === "number"
      ? {
          confirmedJpyc: progressRaw.confirmedJpyc,
          targetJpyc: progressRaw.targetJpyc as number | null,
          progressPct: progressRaw.progressPct,
        }
      : null;

  return { goal, progress };
}

// ===== Public API response（/api/public/creator）=====
type PublicCreatorResponse =
  | {
      ok: true;
      creator: {
        username: string;
        displayName: string;
        profileText: string | null;
        avatarUrl: string | null;
        themeColor: string | null;
        qrcodeUrl: string | null;
        externalUrl: string | null;
      };
      activeProjectId: string | null;
      summary: unknown | null;
    }
  | { ok: false; error: string; detail?: string };

function normalizeCreator(raw: CreatorApiResponse): CreatorProfile {
  return {
    username: raw.username,
    address: raw.address ?? undefined,
    displayName: raw.displayName ?? raw.username,
    avatarUrl: raw.avatar ?? null,
    profile: raw.profileText ?? null,
    qrcode: raw.qrcode ?? null,
    url: raw.url ?? null,
    goalTitle: raw.goalTitle ?? null,
    goalTargetJpyc: raw.goalTargetJpyc ?? null,
    themeColor: raw.themeColor ?? null,
    socials: raw.socials,
    youtubeVideos: raw.youtubeVideos,
  };
}

const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;

  let creator: CreatorProfile | null = null;

  try {
    const res = await fetch(
      `${SITE_BASE_URL}/api/creators/${encodeURIComponent(username)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const raw = (await res.json()) as CreatorApiResponse;
      creator = normalizeCreator(raw);
    }
  } catch {
    // ignore
  }

  const pageUrl = `${SITE_BASE_URL}/${username}`;
  const displayName = creator?.displayName || username;

  const description =
    creator?.profile ||
    `${displayName} さんを JPYC で応援できる投げ銭ページです。`;

  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : `${SITE_BASE_URL}${rawImage}`;

  const title = `${displayName} さんへの JPYC投げ銭`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  // 1) クリエイタープロフィール（表示用）
  const res = await fetch(
    `${SITE_BASE_URL}/api/creators/${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );
  if (!res.ok) notFound();

  const raw = (await res.json()) as CreatorApiResponse;
  const creator = normalizeCreator(raw);
  const themeColor = creator.themeColor ?? "#005bbb";

  // 2) projectId を Prisma から取得（既存ロジックそのまま）
  let projectId: string | null = null;

  try {
    const profileRow = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true, activeProjectId: true, walletAddress: true },
    });

    if (profileRow) {
      if (profileRow.activeProjectId != null) {
        projectId = profileRow.activeProjectId.toString();
      } else {
        const projByCreator = await prisma.project.findFirst({
          where: { creatorProfileId: profileRow.id },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        if (projByCreator?.id != null) {
          projectId = projByCreator.id.toString();
        } else {
          const owner = profileRow.walletAddress?.toLowerCase() ?? null;

          if (owner) {
            const projByOwner = await prisma.project.findFirst({
              where: { ownerAddress: owner },
              select: { id: true },
              orderBy: { createdAt: "desc" },
            });

            if (projByOwner?.id != null) {
              projectId = projByOwner.id.toString();

              await prisma.$transaction([
                prisma.project.update({
                  where: { id: projByOwner.id },
                  data: { creatorProfileId: profileRow.id },
                }),
                prisma.creatorProfile.update({
                  where: { id: profileRow.id },
                  data: { activeProjectId: projByOwner.id },
                }),
              ]);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to resolve projectId:", e);
    projectId = null;
  }

  // 3) /api/public/creator から publicSummaryLite を取得（追加）
  let publicSummaryLite: PublicSummaryLite | null = null;

  try {
    const pres = await fetch(
      `${SITE_BASE_URL}/api/public/creator?username=${encodeURIComponent(
        username
      )}`,
      { cache: "no-store" }
    );
    const pjson: unknown = await pres.json().catch(() => null);

    if (pres.ok && isRecord(pjson) && pjson.ok === true) {
      const p = pjson as Extract<PublicCreatorResponse, { ok: true }>;
      publicSummaryLite = p.summary ? pickPublicSummaryLite(p.summary) : null;
    }
  } catch {
    publicSummaryLite = null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
      <div className="flex-1 pb-24">
        <ProfileClient
          username={username}
          creator={creator}
          projectId={projectId}
          publicSummary={publicSummaryLite} // ✅ 追加：ProfileClientへ渡す
        />
      </div>

      <BottomNav
        active="favorite"
        themeColor={themeColor}
        username={username}
      />
    </div>
  );
}
