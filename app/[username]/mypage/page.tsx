// app/[username]/mypage/page.tsx
import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AccountPageClient from "./AccountPageClient";
import type { CreatorProfile } from "@/types/creator";
import { prisma } from "@/lib/prisma";

type Params = { username: string };

export default async function MyPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

  // 1) クリエイタープロフィール（テーマカラー取得用など）
  const res = await fetch(
    `${BASE_URL}/api/creators/${encodeURIComponent(username)}`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    notFound();
  }

  const creator = (await res.json()) as CreatorProfile;
  const themeColor = creator.themeColor ?? "#005bbb";

  // 2) この username に紐づく Project を Prisma から取得
  let projectId: string | null = null;

  try {
    const profileRow = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });

    if (profileRow?.id != null) {
      const proj = await prisma.project.findFirst({
        where: { creatorProfileId: profileRow.id },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      projectId = proj?.id != null ? proj.id.toString() : null;
    }
  } catch (e) {
    console.error("Failed to resolve projectId for mypage:", e);
    projectId = null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
      {/* マイページ本体 */}
      <div className="flex-1 pb-24">
        {/* ★ projectId を渡す */}
        <AccountPageClient username={username} />
      </div>

      {/* ボトムメニュー */}
      <BottomNav active="profile" themeColor={themeColor} username={username} />
    </div>
  );
}

// // app/[username]/mypage/page.tsx
// import { notFound } from "next/navigation";
// import BottomNav from "@/components/BottomNav";
// import AccountPageClient from "./AccountPageClient";
// import type { CreatorProfile } from "@/types/creator";
// import { prisma } from "@/lib/prisma";

// type Params = { username: string };

// export const dynamic = "force-dynamic";

// function isRecord(v: unknown): v is Record<string, unknown> {
//   return typeof v === "object" && v !== null;
// }

// function toOptionalString(v: unknown): string | undefined {
//   return typeof v === "string" ? v : undefined;
// }

// function toOptionalNumber(v: unknown): number | undefined {
//   return typeof v === "number" && Number.isFinite(v) ? v : undefined;
// }

// export default async function MyPage({ params }: { params: Promise<Params> }) {
//   const { username } = await params;

//   // 1) CreatorProfile を Prisma から取得（HTTP fetch をやめて 404/Invalid URL を回避）
//   const profile = await prisma.creatorProfile.findUnique({
//     where: { username },
//     include: { socialLinks: true, youtubeVideos: true },
//   });

//   if (!profile) notFound();

//   // 2) 最新の Project を 1つだけ有効（最新1件のみ取得）
//   const latestProject = await prisma.project.findFirst({
//     where: { creatorProfileId: profile.id },
//     select: { id: true },
//     orderBy: { createdAt: "desc" },
//   });

//   // Prisma の id が bigint の場合があるので、必ず string 化して Client へ渡す
//   const projectId: string | null =
//     latestProject?.id != null ? String(latestProject.id) : null;

//   // socials を { TWITTER: "url", ... } 形式に整形
//   const socials: Record<string, string> = {};
//   for (const link of profile.socialLinks) {
//     socials[link.type] = link.url;
//   }

//   // AccountPageClient / BottomNav が欲しい CreatorProfile 形に寄せる
//   const creator: CreatorProfile = {
//     username: profile.username,
//     displayName: profile.displayName ?? undefined,
//     profileText: profile.profileText ?? undefined,
//     avatar: profile.avatarUrl ?? undefined,
//     qrcode: profile.qrcodeUrl ?? undefined,
//     url: profile.externalUrl ?? undefined,
//     goalTitle: profile.goalTitle ?? undefined,
//     goalTargetJpyc: profile.goalTargetJpyc ?? undefined,
//     themeColor: profile.themeColor ?? undefined,
//     address: profile.walletAddress ?? undefined,
//     socials,
//     youtubeVideos: profile.youtubeVideos.map((v) => ({
//       url: v.url,
//       title: v.title ?? "",
//       description: v.description ?? "",
//     })),
//   };

//   const themeColor = creator.themeColor ?? "#005bbb";

//   return (
//     <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
//       {/* マイページ本体（ここは元の構成を維持） */}
//       <div className="flex-1 pb-24">
//         <AccountPageClient
//           username={username}
//           creator={creator}
//           projectId={projectId}
//         />
//       </div>

//       {/* ボトムメニュー（元のまま） */}
//       <BottomNav active="profile" themeColor={themeColor} username={username} />
//     </div>
//   );
// }
