// app/api/creators/[username]/apply/route.ts
import type { NextRequest } from "next/server";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

type Params = { username: string };

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const { username } = await context.params;

  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return errJson("Invalid JSON", 400);
    }

    const {
      address: rawAddress,
      displayName,
      profileText,
      avatarUrl,
      qrcodeUrl,
      externalUrl,
      themeColor,
      email,
    } = body as {
      address?: string;
      displayName?: string;
      profileText?: string;
      avatarUrl?: string;
      qrcodeUrl?: string;
      externalUrl?: string;
      themeColor?: string;
      email?: string;
    };

    const normalizedDisplayName = toNonEmptyString(displayName);
    const walletAddressRaw = toAddressOrNull(rawAddress);

    if (!walletAddressRaw || !normalizedDisplayName) {
      return errJson("ADDRESS_OR_DISPLAY_NAME_REQUIRED", 400);
    }

    const walletAddress = walletAddressRaw.toLowerCase();
    const ownerSession = await requireOwnerSession(req, walletAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const existingByUsername = await prisma.creatorProfile.findUnique({
      where: { username },
    });

    if (
      existingByUsername &&
      existingByUsername.walletAddress &&
      existingByUsername.walletAddress !== walletAddress
    ) {
      return errJson(
        "このURL（username）は既に別のウォレットで使われています。",
        409
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
          displayName: normalizedDisplayName,
          profileText: profileText ?? null,
          avatarUrl: avatarUrl ?? null,
          qrcodeUrl: qrcodeUrl ?? null,
          externalUrl: externalUrl ?? null,
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
          displayName: normalizedDisplayName,
          profileText: profileText ?? base.profileText,
          avatarUrl: avatarUrl ?? base.avatarUrl,
          qrcodeUrl: qrcodeUrl ?? base.qrcodeUrl,
          externalUrl: externalUrl ?? base.externalUrl,
          themeColor: themeColor ?? base.themeColor,
        },
      });
    }

    return okJson({
      creator: {
        username: profileRow.username,
        displayName: profileRow.displayName,
        walletAddress: profileRow.walletAddress,
      },
    });
  } catch (e) {
    console.error(e);
    return errJson("CREATOR_APPLY_FAILED", 500);
  }
}
