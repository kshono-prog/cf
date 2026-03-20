// app/api/public/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { errJson, routeJson } from "@/lib/api/responses";
import {
  fetchPublicCreatorByUsername,
  type PublicErr,
  type PublicOk,
} from "@/lib/publicCreatorApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<PublicOk | PublicErr>> {
  const { searchParams } = new URL(req.url);
  const usernameRaw = searchParams.get("username");

  if (!isNonEmptyString(usernameRaw)) {
    return withCorsResponse(
      req,
      errJson("USERNAME_REQUIRED", 400),
      undefined,
      corsReadOnlyMethods
    );
  }

  const username = usernameRaw.trim();
  const response = await fetchPublicCreatorByUsername(username);
  return withCorsResponse(
    req,
    routeJson(response),
    undefined,
    corsReadOnlyMethods
  );
}
