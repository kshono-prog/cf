import { NextRequest, NextResponse } from "next/server";
import { fetchCreatorPublicDtoByUsername } from "@/lib/publicCreatorApi";

type CreatorRouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(
  _req: NextRequest,
  context: CreatorRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;
  const response = await fetchCreatorPublicDtoByUsername(username);
  return NextResponse.json(response.body, { status: response.status });
}

// キャッシュ戦略は必要なら
export const dynamic = "force-dynamic";
