import {
  findTargetCreator,
  getCreatorFollowSummary,
  type CreatorFollowSummary,
} from "@/lib/creatorFollow";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { findCreatorByWalletAddress } from "@/lib/social";

export type CreatorFollowSummaryOk = {
  ok: true;
} & CreatorFollowSummary;

export type CreatorFollowSummaryErr = {
  ok: false;
  error:
    | "CREATOR_NOT_FOUND"
    | "VIEWER_NOT_REGISTERED"
    | "CANNOT_FOLLOW_SELF"
    | "CREATOR_FOLLOW_GET_FAILED"
    | "CREATOR_FOLLOW_POST_FAILED"
    | "CREATOR_FOLLOW_DELETE_FAILED";
};

type FollowSummaryDeps = {
  findTargetCreator?: (username: string) => ReturnType<typeof findTargetCreator>;
  findCreatorByWalletAddress?: (
    address: string
  ) => ReturnType<typeof findCreatorByWalletAddress>;
  getCreatorFollowSummary: (args: {
    username: string;
    viewerAddress: string | null;
  }) => Promise<CreatorFollowSummary | null>;
  createCreatorFollow?: (args: {
    followerProfileId: bigint;
    followingProfileId: bigint;
  }) => Promise<void>;
  deleteCreatorFollow?: (args: {
    followerProfileId: bigint;
    followingProfileId: bigint;
  }) => Promise<void>;
};

const followSummaryDeps: FollowSummaryDeps = {
  findTargetCreator,
  findCreatorByWalletAddress,
  getCreatorFollowSummary,
  createCreatorFollow: async ({ followerProfileId, followingProfileId }) => {
    await prisma.creatorFollow.create({
      data: {
        followerProfileId,
        followingProfileId,
      },
    });
  },
  deleteCreatorFollow: async ({ followerProfileId, followingProfileId }) => {
    await prisma.creatorFollow.deleteMany({
      where: {
        followerProfileId,
        followingProfileId,
      },
    });
  },
};

export async function fetchCreatorFollowSummaryByUsername(args: {
  username: string;
  viewerAddress: string | null;
  deps?: FollowSummaryDeps;
}): Promise<{
  status: 200 | 404 | 500;
  body: CreatorFollowSummaryOk | CreatorFollowSummaryErr;
}> {
  const { deps = followSummaryDeps, username, viewerAddress } = args;

  try {
    const payload = await deps.getCreatorFollowSummary({
      username,
      viewerAddress,
    });
    if (!payload) {
      return {
        status: 404,
        body: {
          ok: false,
          error: "CREATOR_NOT_FOUND",
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        ...payload,
      },
    };
  } catch {
    return {
      status: 500,
      body: {
        ok: false,
        error: "CREATOR_FOLLOW_GET_FAILED",
      },
    };
  }
}

export async function mutateCreatorFollowByUsername(args: {
  action: "follow" | "unfollow";
  username: string;
  viewerAddress: string;
  deps?: FollowSummaryDeps;
}): Promise<{
  status: 200 | 400 | 404 | 500;
  body: CreatorFollowSummaryOk | CreatorFollowSummaryErr;
}> {
  const { deps = followSummaryDeps, action, username, viewerAddress } = args;

  try {
    const [creator, viewer] = await Promise.all([
      deps.findTargetCreator?.(username) ?? Promise.resolve(null),
      deps.findCreatorByWalletAddress?.(viewerAddress) ?? Promise.resolve(null),
    ]);

    if (!creator) {
      return {
        status: 404,
        body: {
          ok: false,
          error: "CREATOR_NOT_FOUND",
        },
      };
    }

    if (!viewer) {
      return {
        status: 404,
        body: {
          ok: false,
          error: "VIEWER_NOT_REGISTERED",
        },
      };
    }

    if (action === "follow" && viewer.id === creator.id) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "CANNOT_FOLLOW_SELF",
        },
      };
    }

    if (action === "follow") {
      try {
        await deps.createCreatorFollow?.({
          followerProfileId: viewer.id,
          followingProfileId: creator.id,
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
      }
    } else {
      await deps.deleteCreatorFollow?.({
        followerProfileId: viewer.id,
        followingProfileId: creator.id,
      });
    }

    const payload = await deps.getCreatorFollowSummary({
      username,
      viewerAddress,
    });
    if (!payload) {
      return {
        status: 404,
        body: {
          ok: false,
          error: "CREATOR_NOT_FOUND",
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        ...payload,
      },
    };
  } catch {
    return {
      status: 500,
      body: {
        ok: false,
        error:
          action === "follow"
            ? "CREATOR_FOLLOW_POST_FAILED"
            : "CREATOR_FOLLOW_DELETE_FAILED",
      },
    };
  }
}
