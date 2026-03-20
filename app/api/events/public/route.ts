// app/api/events/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { errJson, routeJson } from "@/lib/api/responses";
import { fetchPublicEvents } from "@/lib/publicEventsApi";

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const response = await fetchPublicEvents({
      excludeRaw: url.searchParams.get("exclude"),
      limitRaw: url.searchParams.get("limit"),
      categoryRaw: url.searchParams.get("category"),
    });
    return withCorsResponse(req, routeJson(response), undefined, corsReadOnlyMethods);
  } catch (error: unknown) {
    console.error("PUBLIC_EVENT_LIST_ERROR", error);
    return withCorsResponse(
      req,
      errJson("PUBLIC_EVENT_LIST_FAILED", 500),
      undefined,
      corsReadOnlyMethods
    );
  }
}
