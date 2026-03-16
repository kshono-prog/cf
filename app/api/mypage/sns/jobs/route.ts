import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  serializeAiPromotionJob,
  toAiPromotionJobType,
  toNullableUuidString,
} from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostBody = {
  address?: unknown;
  jobType?: unknown;
  aiAgentId?: unknown;
  postId?: unknown;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSession(
      req,
      searchParams.get("address") ?? undefined
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const rows = await prisma.aiPromotionJob.findMany({
      where: { creatorProfileId: creator.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        creatorProfileId: true,
        aiAgentId: true,
        postId: true,
        jobType: true,
        status: true,
        inputJson: true,
        outputJson: true,
        executionCostUsd: true,
        billable: true,
        billingStatus: true,
        createdAt: true,
        updatedAt: true,
        aiAgent: {
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
          },
        },
        post: {
          select: {
            id: true,
            body: true,
            status: true,
            visibility: true,
          },
        },
      },
    });

    return okJson({
      jobs: rows.map((row) => serializeAiPromotionJob(row)),
      count: rows.length,
    });
  } catch (error) {
    console.error("MYPAGE_SNS_JOBS_GET_FAILED", error);
    return errJson("MYPAGE_SNS_JOBS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;
    if (typeof body.address !== "string") return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, body.address);
    if (!ownerSession.ok) return ownerSession.response;

    const jobType = toAiPromotionJobType(body.jobType);
    if (!jobType) return errJson("JOB_TYPE_INVALID", 400);

    const aiAgentId = toNullableUuidString(body.aiAgentId);
    if (typeof body.aiAgentId !== "undefined" && typeof aiAgentId === "undefined") {
      return errJson("AI_AGENT_ID_INVALID", 400);
    }

    const postId = toNullableUuidString(body.postId);
    if (typeof body.postId !== "undefined" && typeof postId === "undefined") {
      return errJson("POST_ID_INVALID", 400);
    }

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (aiAgentId) {
      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: aiAgentId,
          creatorProfileId: creator.id,
        },
        select: { id: true },
      });
      if (!agent) return errJson("AI_AGENT_NOT_FOUND", 404);
    }

    if (postId) {
      const post = await prisma.post.findFirst({
        where: {
          id: postId,
          creatorProfileId: creator.id,
        },
        select: { id: true },
      });
      if (!post) return errJson("POST_NOT_FOUND", 404);
    }

    const now = new Date();
    const row = await prisma.aiPromotionJob.create({
      data: {
        creatorProfileId: creator.id,
        aiAgentId: aiAgentId ?? null,
        postId: postId ?? null,
        jobType,
        status: "QUEUED",
        inputJson: {
          source: "mypage",
          requestedAt: now.toISOString(),
        },
        outputJson: {},
        billable: false,
        billingStatus: "NONE",
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        creatorProfileId: true,
        aiAgentId: true,
        postId: true,
        jobType: true,
        status: true,
        inputJson: true,
        outputJson: true,
        executionCostUsd: true,
        billable: true,
        billingStatus: true,
        createdAt: true,
        updatedAt: true,
        aiAgent: {
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
          },
        },
        post: {
          select: {
            id: true,
            body: true,
            status: true,
            visibility: true,
          },
        },
      },
    });

    return okJson({
      job: serializeAiPromotionJob(row),
    });
  } catch (error) {
    console.error("MYPAGE_SNS_JOBS_POST_FAILED", error);
    return errJson("MYPAGE_SNS_JOBS_POST_FAILED", 500);
  }
}
