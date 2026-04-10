import { NextRequest, NextResponse } from "next/server";

import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { errJson } from "@/lib/api/responses";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import {
  applyCreatorProfileQrCodeResponseHeaders,
  renderCreatorProfileQrCodePng,
} from "@/lib/profileQrCodeServer";
import { resolveBaseUrlFromHeaders } from "@/utils/baseUrl";

type CreatorQrCodeRouteContext = {
  params: Promise<{ username: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(
  req: NextRequest,
  context: CreatorQrCodeRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;
  const creator = await getCreatorProfileByUsername(username);

  if (!creator) {
    return withCorsResponse(
      req,
      errJson("CREATOR_NOT_FOUND", 404),
      undefined,
      corsReadOnlyMethods
    );
  }

  const baseUrl = resolveBaseUrlFromHeaders(req.headers);
  const png = await renderCreatorProfileQrCodePng({
    username,
    baseUrl,
  });
  const response = new NextResponse(new Uint8Array(png), { status: 200 });
  applyCreatorProfileQrCodeResponseHeaders(response.headers);

  return withCorsResponse(req, response, undefined, corsReadOnlyMethods);
}
