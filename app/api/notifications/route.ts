import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { findCreatorByWalletAddress } from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationKind = "REPLY" | "LIKE" | "SUPPORT" | "NOTICE";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  href: string;
  title: string;
  body: string;
  actor:
    | {
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }
    | null;
  meta: string | null;
};

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function buildPreview(value: string, maxLength = 80): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatContributionAmount(
  amountDecimal: Prisma.Decimal | null,
  amountRaw: Prisma.Decimal,
  decimals: number,
  currency: string
): string {
  const decimalValue =
    amountDecimal ?? amountRaw.div(new Prisma.Decimal(10).pow(decimals));
  const rendered = decimalValue.toString();
  return `${rendered} ${currency}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ownerSession = await requireOwnerSession(
    req,
    searchParams.get("address") ?? undefined
  );
  if (!ownerSession.ok) {
    return ownerSession.response;
  }

  try {
    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "CREATOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    const [replies, likes, supports] = await Promise.all([
      prisma.reply.findMany({
        where: {
          post: { creatorProfileId: creator.id },
          creatorProfileId: { not: creator.id },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          body: true,
          createdAt: true,
          creatorProfile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          post: {
            select: {
              creatorProfile: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      }),
      prisma.postLike.findMany({
        where: {
          post: { creatorProfileId: creator.id },
          creatorProfileId: { not: creator.id },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          createdAt: true,
          creatorProfile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          post: {
            select: {
              body: true,
              creatorProfile: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      }),
      prisma.contribution.findMany({
        where: {
          status: "CONFIRMED",
          project: { creatorProfileId: creator.id },
        },
        orderBy: { confirmedAt: "desc" },
        take: 12,
        select: {
          id: true,
          currency: true,
          amountDecimal: true,
          amountRaw: true,
          decimals: true,
          fromAddress: true,
          createdAt: true,
          confirmedAt: true,
          project: {
            select: {
              creatorProfile: {
                select: {
                  username: true,
                },
              },
            },
          },
          postTips: {
            take: 1,
            select: {
              post: {
                select: {
                  body: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items: NotificationItem[] = [
      ...replies.map((reply) => ({
        id: `reply-${reply.id}`,
        kind: "REPLY" as const,
        createdAt: reply.createdAt.toISOString(),
        href: `/${reply.post.creatorProfile.username}#posts`,
        title: "返信がありました",
        body: buildPreview(reply.body),
        actor: {
          username: reply.creatorProfile.username,
          displayName: reply.creatorProfile.displayName,
          avatarUrl: reply.creatorProfile.avatarUrl,
        },
        meta: null,
      })),
      ...likes.map((like) => ({
        id: `like-${like.id}`,
        kind: "LIKE" as const,
        createdAt: like.createdAt.toISOString(),
        href: `/${like.post.creatorProfile.username}#posts`,
        title: "いいねが届きました",
        body: buildPreview(like.post.body),
        actor: {
          username: like.creatorProfile.username,
          displayName: like.creatorProfile.displayName,
          avatarUrl: like.creatorProfile.avatarUrl,
        },
        meta: null,
      })),
      ...supports.map((support) => ({
        id: `support-${support.id}`,
        kind: "SUPPORT" as const,
        createdAt: (support.confirmedAt ?? support.createdAt).toISOString(),
        href: `/${
          support.project.creatorProfile?.username ?? creator.username
        }#posts`,
        title: "応援が届きました",
        body:
          support.postTips[0]?.post.body != null
            ? buildPreview(support.postTips[0].post.body)
            : "公開ページへの応援です。",
        actor: null,
        meta: `${shortAddress(support.fromAddress)} から ${formatContributionAmount(
          support.amountDecimal,
          support.amountRaw,
          support.decimals,
          support.currency
        )}`,
      })),
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("NOTIFICATIONS_GET_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "NOTIFICATIONS_GET_FAILED" },
      { status: 500 }
    );
  }
}
