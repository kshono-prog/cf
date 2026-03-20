import { NextRequest, NextResponse } from "next/server";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { resolvePublicCreatorProjectData } from "@/lib/publicCreatorProjects";
import { serializeCreatorPublicDto } from "@/lib/serializers/creator";

type CreatorRouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(
  _req: NextRequest,
  context: CreatorRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;

  const creatorResult = await getCreatorProfileByUsername(username);
  if (!creatorResult) {
    return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
  }

  const { creator, profile } = creatorResult;
  const projectData = await resolvePublicCreatorProjectData({
    creatorProfileId: BigInt(profile.id),
    activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
  });

  return NextResponse.json(
    serializeCreatorPublicDto({
      creator,
      projectId: projectData.projectId,
      projectIdsByCurrency: projectData.projectIdsByCurrency,
      latestProjectSummary: projectData.latestProjectSummary,
    })
  );
}

// キャッシュ戦略は必要なら
export const dynamic = "force-dynamic";
