import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  serializeAiAgent,
  toAiAgentRole,
} from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostBody = {
  address?: unknown;
  name?: unknown;
  role?: unknown;
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

    const rows = await prisma.aiAgent.findMany({
      where: { creatorProfileId: creator.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        creatorProfileId: true,
        name: true,
        role: true,
        status: true,
        configJson: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            replies: true,
            jobs: true,
          },
        },
      },
    });

    return okJson({
      agents: rows.map((row) => serializeAiAgent(row)),
      count: rows.length,
    });
  } catch (error) {
    console.error("MYPAGE_SNS_AGENTS_GET_FAILED", error);
    return errJson("MYPAGE_SNS_AGENTS_GET_FAILED", 500);
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
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return errJson("NAME_REQUIRED", 400);
    }
    if (body.name.trim().length > 80) return errJson("NAME_TOO_LONG", 400);

    const role = toAiAgentRole(body.role);
    if (!role) return errJson("ROLE_INVALID", 400);

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const row = await prisma.aiAgent.create({
      data: {
        creatorProfileId: creator.id,
        name: body.name.trim(),
        role,
        status: "ACTIVE",
        configJson: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        creatorProfileId: true,
        name: true,
        role: true,
        status: true,
        configJson: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            replies: true,
            jobs: true,
          },
        },
      },
    });

    return okJson({
      agent: serializeAiAgent(row),
    });
  } catch (error) {
    console.error("MYPAGE_SNS_AGENTS_POST_FAILED", error);
    return errJson("MYPAGE_SNS_AGENTS_POST_FAILED", 500);
  }
}
