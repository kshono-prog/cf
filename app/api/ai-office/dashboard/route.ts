import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  getAiOfficeDashboard,
  toAiOfficeTaskStatus,
} from "@/lib/aiOfficeDashboard";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

function toMetricLimit(v: string | null): number {
  if (!v) return 20;
  const n = Number(v);
  if (!Number.isFinite(n)) return 20;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

function toTrendDays(v: string | null): number {
  if (!v) return 7;
  const n = Number(v);
  if (!Number.isFinite(n)) return 7;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 30) return 30;
  return i;
}

function toTaskLimit(v: string | null): number {
  if (!v) return 30;
  const n = Number(v);
  if (!Number.isFinite(n)) return 30;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const statusRaw = searchParams.get("status");
    const taskStatus = toAiOfficeTaskStatus(statusRaw);
    if (statusRaw && !taskStatus) {
      return errJson("STATUS_INVALID", 400);
    }

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const dashboard = await getAiOfficeDashboard({
      address: ownerSession.address,
      projectId,
      taskStatus,
      metricLimit: toMetricLimit(searchParams.get("metricLimit")),
      trendDays: toTrendDays(searchParams.get("trendDays")),
      taskLimit: toTaskLimit(searchParams.get("taskLimit")),
    });

    if (!dashboard) return errJson("CREATOR_NOT_FOUND", 404);

    return okJson(dashboard);
  } catch (e) {
    console.error("AI_OFFICE_DASHBOARD_GET_FAILED", e);
    return errJson("AI_OFFICE_DASHBOARD_GET_FAILED", 500);
  }
}
