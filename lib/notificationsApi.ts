import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { findCreatorByWalletAddress } from "@/lib/social";

export type NotificationKind = "REPLY" | "LIKE" | "SUPPORT" | "NOTICE";

export type NotificationItem = {
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

export type NotificationsOk = {
  ok: true;
  items: NotificationItem[];
};

export type NotificationsErr = {
  ok: false;
  error: "CREATOR_NOT_FOUND" | "NOTIFICATIONS_GET_FAILED";
};

type CreatorLookupResult = Awaited<ReturnType<typeof findCreatorByWalletAddress>>;

type ReplyNotificationRow = {
  id: string;
  body: string;
  createdAt: Date;
  creatorProfile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  post: {
    creatorProfile: {
      username: string;
    };
  };
};

type LikeNotificationRow = {
  id: string;
  createdAt: Date;
  creatorProfile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  post: {
    body: string;
    creatorProfile: {
      username: string;
    };
  };
};

type SupportNotificationRow = {
  id: string;
  currency: string;
  amountDecimal: Prisma.Decimal | null;
  amountRaw: Prisma.Decimal;
  decimals: number;
  fromAddress: string;
  createdAt: Date;
  confirmedAt: Date | null;
  project: {
    creatorProfile: {
      username: string;
    } | null;
  };
  postTips: Array<{
    post: {
      body: string;
    };
  }>;
};

type NotificationsDeps = {
  findCreatorByWalletAddress: (
    address: string
  ) => Promise<CreatorLookupResult>;
  findReplyNotifications: (creatorId: bigint) => Promise<ReplyNotificationRow[]>;
  findLikeNotifications: (creatorId: bigint) => Promise<LikeNotificationRow[]>;
  findSupportNotifications: (
    creatorId: bigint
  ) => Promise<SupportNotificationRow[]>;
};

const notificationsDeps: NotificationsDeps = {
  findCreatorByWalletAddress,
  findReplyNotifications: async (creatorId) =>
    withPrismaRetry(() =>
      prisma.reply.findMany({
      where: {
        post: { creatorProfileId: creatorId },
        creatorProfileId: { not: creatorId },
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
      })
    ),
  findLikeNotifications: async (creatorId) =>
    withPrismaRetry(() =>
      prisma.postLike.findMany({
      where: {
        post: { creatorProfileId: creatorId },
        creatorProfileId: { not: creatorId },
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
      })
    ),
  findSupportNotifications: async (creatorId) =>
    withPrismaRetry(() =>
      prisma.contribution.findMany({
      where: {
        status: "CONFIRMED",
        project: { creatorProfileId: creatorId },
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
      })
    ),
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
  return `${decimalValue.toString()} ${currency}`;
}

export async function fetchNotificationsByOwnerAddress(
  ownerAddress: string,
  deps: NotificationsDeps = notificationsDeps
): Promise<{
  status: 200 | 404 | 500;
  body: NotificationsOk | NotificationsErr;
}> {
  try {
    const creator = await deps.findCreatorByWalletAddress(ownerAddress);
    if (!creator) {
      return {
        status: 404,
        body: {
          ok: false,
          error: "CREATOR_NOT_FOUND",
        },
      };
    }

    const replies = await deps.findReplyNotifications(creator.id);
    const likes = await deps.findLikeNotifications(creator.id);
    const supports = await deps.findSupportNotifications(creator.id);

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

    return {
      status: 200,
      body: {
        ok: true,
        items,
      },
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return {
        status: 200,
        body: {
          ok: true,
          items: [],
        },
      };
    }

    return {
      status: 500,
      body: {
        ok: false,
        error: "NOTIFICATIONS_GET_FAILED",
      },
    };
  }
}
