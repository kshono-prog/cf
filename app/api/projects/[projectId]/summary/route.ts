/* app/api/projects/[projectId]/summary/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { getProjectSummaryView } from "@/lib/projectSummary";

export const dynamic = "force-dynamic";

type Params = { projectId: string };
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");
    const summary = await getProjectSummaryView(projectId);
    if (!summary) return errJson("PROJECT_NOT_FOUND", 404);
    return okJson(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "PROJECT_CURRENCY_INVALID") {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }
    console.error("PROJECT_SUMMARY_GET_FAILED", e);
    return errJson("PROJECT_SUMMARY_GET_FAILED", 500);
  }
}
