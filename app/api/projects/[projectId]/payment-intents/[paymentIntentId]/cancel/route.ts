/* app/api/projects/[projectId]/payment-intents/[paymentIntentId]/cancel/route.ts */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow } from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";

type Params = { projectId: string; paymentIntentId: string };

function lower(v: string): string {
  return v.toLowerCase();
}

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId, paymentIntentId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    if (!isUuidString(paymentIntentId)) {
      return errJson("PAYMENT_INTENT_ID_INVALID", 400);
    }

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) return errJson("BODY_INVALID", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const owner = project.ownerAddress ? lower(project.ownerAddress) : null;
    if (!owner || owner !== ownerSession.address) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const intent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!intent || intent.projectId !== pid) {
      return errJson("PAYMENT_INTENT_NOT_FOUND", 404);
    }
    if (intent.contributionId) {
      return errJson("PAYMENT_INTENT_ALREADY_LINKED", 409);
    }

    const now = new Date();
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "CANCELED",
        canceledAt: now,
        updatedAt: now,
      },
    });

    return okJson({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PAYMENT_INTENT_CANCEL_FAILED", e);
    return errJson("PAYMENT_INTENT_CANCEL_FAILED", 500);
  }
}
