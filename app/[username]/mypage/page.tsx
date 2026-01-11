// app/[username]/mypage/page.tsx
import { notFound } from "next/navigation";
import AccountPageClient from "./AccountPageClient";
import { prisma } from "@/lib/prisma";

type Params = { username: string };

export default async function MyPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

  // 1) クリエイタープロフィールの存在確認
  const res = await fetch(
    `${BASE_URL}/api/creators/${encodeURIComponent(username)}`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    notFound();
  }

  await res.json();

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

  return <AccountPageClient username={username} />;
}
