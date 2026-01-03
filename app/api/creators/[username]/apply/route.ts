// app/api/creators/[username]/apply/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const { username } = (context.params ?? {}) as { username: string };

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      address: rawAddress,
      displayName,
      profileText,
      avatarUrl,
      qrcodeUrl,
      externalUrl,
      goalTitle,
      goalTargetJpyc,
      themeColor,
      email,
    } = body as {
      address?: string;
      displayName?: string;
      profileText?: string;
      avatarUrl?: string;
      qrcodeUrl?: string;
      externalUrl?: string;
      goalTitle?: string;
      goalTargetJpyc?: number;
      themeColor?: string;
      email?: string;
    };

    if (!rawAddress || !displayName) {
      return NextResponse.json(
        { error: "address と displayName は必須です" },
        { status: 400 }
      );
    }

    const walletAddress = rawAddress.toLowerCase();

    const existingByUsername = await prisma.creatorProfile.findUnique({
      where: { username },
    });

    if (
      existingByUsername &&
      existingByUsername.walletAddress &&
      existingByUsername.walletAddress !== walletAddress
    ) {
      return NextResponse.json(
        { error: "このURL（username）は既に別のウォレットで使われています。" },
        { status: 409 }
      );
    }

    const existingByWallet = await prisma.creatorProfile.findFirst({
      where: { walletAddress },
    });

    let profileRow;

    if (!existingByUsername && !existingByWallet) {
      profileRow = await prisma.creatorProfile.create({
        data: {
          username,
          walletAddress,
          email: email ?? null,
          displayName,
          profileText: profileText ?? null,
          avatarUrl: avatarUrl ?? null,
          qrcodeUrl: qrcodeUrl ?? null,
          externalUrl: externalUrl ?? null,
          goalTitle: goalTitle ?? null,
          goalTargetJpyc: goalTargetJpyc ?? null,
          themeColor: themeColor ?? null,
        },
      });
    } else {
      const base = existingByUsername ?? existingByWallet!;
      profileRow = await prisma.creatorProfile.update({
        where: { id: base.id },
        data: {
          username,
          walletAddress,
          email: email ?? base.email,
          displayName,
          profileText: profileText ?? base.profileText,
          avatarUrl: avatarUrl ?? base.avatarUrl,
          qrcodeUrl: qrcodeUrl ?? base.qrcodeUrl,
          externalUrl: externalUrl ?? base.externalUrl,
          goalTitle: goalTitle ?? base.goalTitle,
          goalTargetJpyc:
            typeof goalTargetJpyc === "number"
              ? goalTargetJpyc
              : base.goalTargetJpyc,
          themeColor: themeColor ?? base.themeColor,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      creator: {
        username: profileRow.username,
        displayName: profileRow.displayName,
        walletAddress: profileRow.walletAddress,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "CREATOR_APPLY_FAILED" },
      { status: 500 }
    );
  }
}
