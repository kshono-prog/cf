import { NextRequest, NextResponse } from "next/server";

import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { findCreatorByWalletAddress } from "@/lib/social";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ok<T extends Record<string, unknown>>(
  req: NextRequest,
  data: T
): NextResponse<{ ok: true } & T> {
  return withCorsResponse(req, okJson(data), undefined, corsReadOnlyMethods);
}

function err(req: NextRequest, code: string, status: number): NextResponse {
  return withCorsResponse(req, errJson(code, status), undefined, corsReadOnlyMethods);
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

function toDecimalString(value: { toString(): string } | null): string {
  return value ? value.toString() : "0";
}

function buildEmptySnsSummary() {
  return {
    postCount: 0,
    publishedCount: 0,
    draftCount: 0,
    archivedCount: 0,
    aiGeneratedPostCount: 0,
    totalLikes: 0,
    totalReplies: 0,
    totalTips: 0,
    tipTotals: {
      JPYC: "0",
      USDC: "0",
    },
    analytics: {
      trackedPostCount: 0,
      impressionCount: 0,
      profileClickCount: 0,
      engagementScore: "0",
    },
    agents: {
      total: 0,
      active: 0,
    },
    jobs: {
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
    },
    lastPostAt: null,
    lastPublishedAt: null,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) {
      return withCorsResponse(
        req,
        ownerSession.response,
        undefined,
        corsReadOnlyMethods
      );
    }

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return err(req, "CREATOR_NOT_FOUND", 404);

    const totalPostCount = await prisma.post.count({
      where: { creatorProfileId: creator.id },
    });
    const publishedCount = await prisma.post.count({
      where: { creatorProfileId: creator.id, status: "PUBLISHED" },
    });
    const draftCount = await prisma.post.count({
      where: { creatorProfileId: creator.id, status: "DRAFT" },
    });
    const archivedCount = await prisma.post.count({
      where: { creatorProfileId: creator.id, status: "ARCHIVED" },
    });
    const aiGeneratedCount = await prisma.post.count({
      where: { creatorProfileId: creator.id, aiGenerated: true },
    });
    const postAggregates = await prisma.post.aggregate({
      where: { creatorProfileId: creator.id },
      _sum: {
        likeCount: true,
        replyCount: true,
        tipCount: true,
        tipAmountJpyc: true,
        tipAmountUsdc: true,
      },
    });
    const lastPost = await prisma.post.findFirst({
      where: { creatorProfileId: creator.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const lastPublishedPost = await prisma.post.findFirst({
      where: { creatorProfileId: creator.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const trackedPostCount = await prisma.postAnalytics.count({
      where: {
        post: {
          creatorProfileId: creator.id,
        },
      },
    });
    const analyticsAggregates = await prisma.postAnalytics.aggregate({
      where: {
        post: {
          creatorProfileId: creator.id,
        },
      },
      _sum: {
        impressionCount: true,
        profileClickCount: true,
        engagementScore: true,
      },
    });
    const totalAgentCount = await prisma.aiAgent.count({
      where: { creatorProfileId: creator.id },
    });
    const activeAgentCount = await prisma.aiAgent.count({
      where: {
        creatorProfileId: creator.id,
        status: "ACTIVE",
      },
    });
    const queuedJobCount = await prisma.aiPromotionJob.count({
      where: { creatorProfileId: creator.id, status: "QUEUED" },
    });
    const runningJobCount = await prisma.aiPromotionJob.count({
      where: { creatorProfileId: creator.id, status: "RUNNING" },
    });
    const doneJobCount = await prisma.aiPromotionJob.count({
      where: { creatorProfileId: creator.id, status: "DONE" },
    });
    const failedJobCount = await prisma.aiPromotionJob.count({
      where: { creatorProfileId: creator.id, status: "FAILED" },
    });

    return ok(req, {
      summary: {
        postCount: totalPostCount,
        publishedCount,
        draftCount,
        archivedCount,
        aiGeneratedPostCount: aiGeneratedCount,
        totalLikes: postAggregates._sum.likeCount ?? 0,
        totalReplies: postAggregates._sum.replyCount ?? 0,
        totalTips: postAggregates._sum.tipCount ?? 0,
        tipTotals: {
          JPYC: toDecimalString(postAggregates._sum.tipAmountJpyc),
          USDC: toDecimalString(postAggregates._sum.tipAmountUsdc),
        },
        analytics: {
          trackedPostCount,
          impressionCount: analyticsAggregates._sum.impressionCount ?? 0,
          profileClickCount: analyticsAggregates._sum.profileClickCount ?? 0,
          engagementScore: toDecimalString(analyticsAggregates._sum.engagementScore),
        },
        agents: {
          total: totalAgentCount,
          active: activeAgentCount,
        },
        jobs: {
          queued: queuedJobCount,
          running: runningJobCount,
          done: doneJobCount,
          failed: failedJobCount,
        },
        lastPostAt: lastPost?.createdAt.toISOString() ?? null,
        lastPublishedAt: lastPublishedPost?.createdAt.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return ok(req, { summary: buildEmptySnsSummary() });
    }
    console.error("MYPAGE_SNS_SUMMARY_GET_FAILED", error);
    return err(req, "MYPAGE_SNS_SUMMARY_GET_FAILED", 500);
  }
}
