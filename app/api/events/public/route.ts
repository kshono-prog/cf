// app/api/events/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchPublicEvents } from "@/lib/publicEventsApi";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const response = await fetchPublicEvents({
      excludeRaw: url.searchParams.get("exclude"),
      limitRaw: url.searchParams.get("limit"),
      categoryRaw: url.searchParams.get("category"),
    });
    return NextResponse.json(response.body, { status: response.status });
  } catch (error: unknown) {
    console.error("PUBLIC_EVENT_LIST_ERROR", error);
    return NextResponse.json(
      { error: "PUBLIC_EVENT_LIST_FAILED" },
      { status: 500 }
    );
  }
}
