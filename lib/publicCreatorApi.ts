import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import {
  resolvePublicCreatorProjectData,
  type PublicCreatorProjectData,
} from "@/lib/publicCreatorProjects";
import {
  serializeCreatorPublicDto,
  type CreatorPublicDto,
  type CreatorLatestProjectSummary,
  type CreatorProjectIdsByCurrency,
} from "@/lib/serializers/creator";
import type { CreatorProfile } from "@/types/creator";

type CreatorProfileLookupResult = Awaited<
  ReturnType<typeof getCreatorProfileByUsername>
>;

type CreatorRouteErr = { error: "CREATOR_NOT_FOUND" };
type CreatorRouteOk = CreatorPublicDto;

type CreatorRouteDeps = {
  getCreatorProfileByUsername: (
    username: string
  ) => Promise<CreatorProfileLookupResult>;
  resolvePublicCreatorProjectData: (
    args: Parameters<typeof resolvePublicCreatorProjectData>[0]
  ) => Promise<PublicCreatorProjectData>;
};

const creatorRouteDeps: CreatorRouteDeps = {
  getCreatorProfileByUsername,
  resolvePublicCreatorProjectData,
};

export type PublicOk = {
  ok: true;
  creator: CreatorPublicDto;
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
  latestProjectSummary: CreatorLatestProjectSummary | null;
  summary: unknown | null;
  summariesByCurrency: {
    JPYC: unknown | null;
    USDC: unknown | null;
  };
};

export type PublicErr = { ok: false; error: string; detail?: string };

export async function fetchCreatorPublicDtoByUsername(
  username: string,
  deps: CreatorRouteDeps = creatorRouteDeps
): Promise<{
  status: 200 | 404;
  body: CreatorRouteOk | CreatorRouteErr;
}> {
  const creatorResult = await deps.getCreatorProfileByUsername(username);
  if (!creatorResult) {
    return {
      status: 404,
      body: { error: "CREATOR_NOT_FOUND" },
    };
  }

  const { creator, profile } = creatorResult;
  const projectData = await deps.resolvePublicCreatorProjectData({
    creatorProfileId: BigInt(profile.id),
    activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
  });

  return {
    status: 200,
    body: serializeCreatorPublicDto({
      creator,
      projectId: projectData.projectId,
      projectIdsByCurrency: projectData.projectIdsByCurrency,
      latestProjectSummary: projectData.latestProjectSummary,
    }),
  };
}

export async function fetchPublicCreatorByUsername(
  username: string,
  deps: CreatorRouteDeps = creatorRouteDeps
): Promise<{
  status: 200 | 404 | 500;
  body: PublicOk | PublicErr;
}> {
  try {
    const creatorResult = await deps.getCreatorProfileByUsername(username);
    if (!creatorResult) {
      return {
        status: 404,
        body: { ok: false, error: "CREATOR_NOT_FOUND" },
      };
    }

    const { creator, profile } = creatorResult;
    const projectData = await deps.resolvePublicCreatorProjectData({
      creatorProfileId: BigInt(profile.id),
      activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
      activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
    });
    const creatorDto = serializeCreatorPublicDto({
      creator,
      projectId: projectData.projectId,
      projectIdsByCurrency: projectData.projectIdsByCurrency,
      latestProjectSummary: projectData.latestProjectSummary,
    });

    return {
      status: 200,
      body: {
        ok: true,
        creator: creatorDto,
        projectId: creatorDto.projectId,
        projectIdsByCurrency: creatorDto.projectIdsByCurrency,
        latestProjectSummary: creatorDto.latestProjectSummary,
        summary: projectData.activeSummary,
        summariesByCurrency: projectData.summariesByCurrency,
      },
    };
  } catch (e: unknown) {
    return {
      status: 500,
      body: {
        ok: false,
        error: "PUBLIC_CREATOR_FETCH_FAILED",
        detail: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

export function createCreatorProfileLookupResult(args: {
  creator: CreatorProfile;
  profile: {
    id: string;
    username: string;
    walletAddress: string | null;
    activeProjectIdJpyc: string | null;
    activeProjectIdUsdc: string | null;
  };
}): NonNullable<CreatorProfileLookupResult> {
  return {
    creator: args.creator,
    profile: args.profile,
  };
}
