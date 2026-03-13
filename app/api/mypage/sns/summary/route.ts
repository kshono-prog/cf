import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { findCreatorByWalletAddress } from "@/lib/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toDecimalString(value: { toString(): string } | null): string {
  return value ? value.toString() : "0";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const creator = await findCreatorByWalletAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const [
      totalPostCount,
      publishedCount,
      draftCount,
      archivedCount,
      aiGeneratedCount,
      postAggregates,
      lastPost,
      lastPublishedPost,
      trackedPostCount,
      analyticsAggregates,
      totalAgentCount,
      activeAgentCount,
      queuedJobCount,
      runningJobCount,
      doneJobCount,
      failedJobCount,
    ] = await Promise.all([
      prisma.post.count({ where: { creatorProfileId: creator.id } }),
      prisma.post.count({
        where: { creatorProfileId: creator.id, status: "PUBLISHED" },
      }),
      prisma.post.count({
        where: { creatorProfileId: creator.id, status: "DRAFT" },
      }),
      prisma.post.count({
        where: { creatorProfileId: creator.id, status: "ARCHIVED" },
      }),
      prisma.post.count({
        where: { creatorProfileId: creator.id, aiGenerated: true },
      }),
      prisma.post.aggregate({
        where: { creatorProfileId: creator.id },
        _sum: {
          likeCount: true,
          replyCount: true,
          tipCount: true,
          tipAmountJpyc: true,
          tipAmountUsdc: true,
        },
      }),
      prisma.post.findFirst({
        where: { creatorProfileId: creator.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.post.findFirst({
        where: { creatorProfileId: creator.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.postAnalytics.count({
        where: {
          post: {
            creatorProfileId: creator.id,
          },
        },
      }),
      prisma.postAnalytics.aggregate({
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
      }),
      prisma.aiAgent.count({ where: { creatorProfileId: creator.id } }),
      prisma.aiAgent.count({
        where: {
          creatorProfileId: creator.id,
          status: "ACTIVE",
        },
      }),
      prisma.aiPromotionJob.count({
        where: { creatorProfileId: creator.id, status: "QUEUED" },
      }),
      prisma.aiPromotionJob.count({
        where: { creatorProfileId: creator.id, status: "RUNNING" },
      }),
      prisma.aiPromotionJob.count({
        where: { creatorProfileId: creator.id, status: "DONE" },
      }),
      prisma.aiPromotionJob.count({
        where: { creatorProfileId: creator.id, status: "FAILED" },
      }),
    ]);

    return okJson({
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
    console.error("MYPAGE_SNS_SUMMARY_GET_FAILED", error);
    return errJson("MYPAGE_SNS_SUMMARY_GET_FAILED", 500);
  }
}
