import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { routeJson } from "@/lib/api/responses";
import { fetchCreatorPublicDtoByUsername } from "@/lib/publicCreatorApi";

type CreatorRouteContext = {
  params: Promise<{ username: string }>;
};

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(
  req: NextRequest,
  context: CreatorRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;
  const response = await fetchCreatorPublicDtoByUsername(username);
  return withCorsResponse(
    req,
    routeJson(response),
    undefined,
    corsReadOnlyMethods
  );
}

// キャッシュ戦略は必要なら
export const dynamic = "force-dynamic";
