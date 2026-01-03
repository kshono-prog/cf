// app/api/public/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

type PublicOk = {
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
  summary: unknown | null; // /api/projects/[id]/summary の応答をそのまま返す
};

type PublicErr = { ok: false; error: string; detail?: string };

export async function GET(
  req: NextRequest
): Promise<NextResponse<PublicOk | PublicErr>> {
  const { searchParams } = new URL(req.url);
  const usernameRaw = searchParams.get("username");

  if (!isNonEmptyString(usernameRaw)) {
    return NextResponse.json(
      { ok: false, error: "USERNAME_REQUIRED" },
      { status: 400 }
    );
  }

  const username = usernameRaw.trim();

  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        profileText: true,
        avatarUrl: true,
        themeColor: true,
        qrcodeUrl: true,
        externalUrl: true,
        activeProjectId: true,
        status: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "CREATOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 公開条件が必要ならここで制御（必要な場合のみ有効化）
    // if (creator.status !== "PUBLISHED") {
    //   return NextResponse.json({ ok: false, error: "CREATOR_NOT_PUBLISHED" }, { status: 404 });
    // }

    const activeProjectId = creator.activeProjectId
      ? creator.activeProjectId.toString()
      : null;

    let summary: unknown | null = null;

    // ここが重要：DB組み立てをやめ、既存 summary API を内部 fetch
    if (activeProjectId) {
      const origin = req.nextUrl.origin;
      const url = `${origin}/api/projects/${encodeURIComponent(
        activeProjectId
      )}/summary`;

      const sres = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (sres && sres.ok) {
        summary = await sres.json().catch(() => null);
      } else {
        summary = null;
      }
    }

    return NextResponse.json({
      ok: true,
      creator: {
        username: creator.username,
        displayName: creator.displayName,
        profileText: creator.profileText,
        avatarUrl: creator.avatarUrl,
        themeColor: creator.themeColor,
        qrcodeUrl: creator.qrcodeUrl,
        externalUrl: creator.externalUrl,
      },
      activeProjectId,
      summary,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "PUBLIC_CREATOR_FETCH_FAILED",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
