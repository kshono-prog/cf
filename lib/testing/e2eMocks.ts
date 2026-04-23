import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import type {
  SummaryViewData,
  SummaryProgress,
  SummaryProject,
} from "@/lib/mypage/accountPageTypes";
import type { MyPageDashboardData } from "@/lib/mypage/dashboardTypes";
import type { MeStatus } from "@/lib/mypage/types";
import type { PublicProfilePageReadModel } from "@/lib/publicProfilePageReadModel";
import { buildSupportProjectView, type SupportProjectView } from "@/lib/supportProfileView";

export const E2E_MOCK_SEARCH_PARAM = "e2eMock";

export type E2EMockScenario = "creatorReady" | "publicProfile" | "userOnly";

const MOCK_OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";
const MOCK_CREATED_AT = "2026-04-01T00:00:00.000Z";
const MOCK_UPDATED_AT = "2026-04-20T00:00:00.000Z";
const MOCK_PROJECT_ID = "e2e-project-jpyc";
const MOCK_PROFILE_ID = "1001";

function readFirst(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return typeof value === "string" ? value : null;
}

export function parseE2EMockScenario(
  value: string | string[] | undefined
): E2EMockScenario | null {
  const raw = readFirst(value)?.trim();
  if (raw === "creatorReady" || raw === "publicProfile" || raw === "userOnly") {
    return raw;
  }
  return null;
}

function buildSummaryProject(username: string): SummaryProject {
  return {
    id: MOCK_PROJECT_ID,
    title: `${username} launch project`,
    description: "E2E smoke project for Creator Founding.",
    status: "ACTIVE",
    currency: "JPYC",
    purposeMode: "OPTIONAL",
    ownerAddress: MOCK_OWNER_ADDRESS,
    creatorProfileId: MOCK_PROFILE_ID,
    bridgedAt: null,
    distributedAt: null,
    createdAt: MOCK_CREATED_AT,
    updatedAt: MOCK_UPDATED_AT,
  };
}

function buildSummaryProgress(): SummaryProgress {
  return {
    currency: "JPYC",
    confirmedAmount: 2500,
    confirmedTotal: 2500,
    confirmedJpyc: 2500,
    confirmedByCurrency: {
      JPYC: 2500,
      USDC: 0,
    },
    targetAmount: 10000,
    targetJpyc: 10000,
    progressPct: 25,
    totals: {
      JPYC: "2500",
      USDC: "0",
    },
  };
}

export function buildCreatorReadySummary(username: string): SummaryViewData {
  return {
    project: buildSummaryProject(username),
    goal: {
      id: "e2e-goal-jpyc",
      unitCurrency: "JPYC",
      targetAmount: 10000,
      targetAmountJpyc: 10000,
      achievedAt: null,
      deadline: "2026-12-31T00:00:00.000Z",
    },
    progress: buildSummaryProgress(),
    distributionPlan: null,
    lastBridgeRuns: [],
    lastDistributionRuns: [],
  };
}

export function buildUserOnlyMeStatus(username: string): MeStatus {
  return {
    hasUser: true,
    hasCreator: false,
    user: {
      username,
      displayName: "E2E Supporter",
      profile: "Preparing a creator page.",
    },
    creator: null,
    projectId: null,
    projectIdsByCurrency: {
      JPYC: null,
      USDC: null,
    },
  };
}

export function buildCreatorReadyMeStatus(username: string): MeStatus {
  return {
    hasUser: true,
    hasCreator: true,
    user: {
      username,
      displayName: "E2E Creator",
      profile: "Creating music and sharing updates.",
    },
    creator: {
      username,
      address: MOCK_OWNER_ADDRESS,
      displayName: "E2E Creator",
      avatarUrl: null,
      profile: "Creating music and sharing updates.",
      qrcode: null,
      url: "https://example.com/e2e",
      themeColor: "#005bbb",
      creatorType: "MUSICIAN",
      ecosystemRole: "CREATOR",
      publicPage: null,
      socials: {
        website: "https://example.com/e2e",
        youtube: "https://youtube.com/@e2ecreator",
        twitter: "https://x.com/e2ecreator",
      },
      youtubeVideos: [
        {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Featured video",
          description: "A featured video for smoke coverage.",
        },
      ],
    },
    projectId: MOCK_PROJECT_ID,
    projectIdsByCurrency: {
      JPYC: MOCK_PROJECT_ID,
      USDC: null,
    },
  };
}

export function buildCreatorReadyDashboard(
  username: string
): MyPageDashboardData {
  return {
    me: buildCreatorReadyMeStatus(username),
    selectedProjectId: MOCK_PROJECT_ID,
    projectsByCurrency: {
      JPYC: {
        projectId: MOCK_PROJECT_ID,
        summary: buildCreatorReadySummary(username),
        settlement: null,
      },
      USDC: null,
    },
  };
}

function buildRecruitingProjects(username: string): SupportProjectView[] {
  return [
    buildSupportProjectView({
      projectId: MOCK_PROJECT_ID,
      currency: "JPYC",
      title: `${username} launch project`,
      description: "E2E smoke project for Creator Founding.",
      targetAmount: 10000,
      confirmedAmount: 2500,
      progressPct: 25,
      achievedAt: null,
      deadline: "2026-12-31T00:00:00.000Z",
    }),
  ];
}

function buildCredibility(): CreatorActivityCredibility {
  return {
    activeMonths: 6,
    totalPostCount: 12,
    goalAchievedCount: 1,
    totalContributorCount: 5,
    lastActiveAt: MOCK_UPDATED_AT,
    meetingCount: 0,
    externalContactCount: 0,
    managerNoteCount: 0,
    activeProjectMemberCount: 0,
    repeatSupporterCount: 2,
    stageEvidenceCount: 0,
  };
}

export function buildPublicProfileReadModel(
  username: string
): PublicProfilePageReadModel {
  const creatorReady = buildCreatorReadyMeStatus(username);
  const recruitingProjects = buildRecruitingProjects(username);

  return {
    pageData: {
      creator: creatorReady.creator!,
      profile: {
        id: MOCK_PROFILE_ID,
        username,
        walletAddress: MOCK_OWNER_ADDRESS,
        activeProjectIdJpyc: MOCK_PROJECT_ID,
        activeProjectIdUsdc: null,
      },
      projectId: MOCK_PROJECT_ID,
      projectIdsByCurrency: {
        JPYC: MOCK_PROJECT_ID,
        USDC: null,
      },
      publicSummary: null,
      publicAiManager: null,
      recentSupportActivities: [],
      supportActionThemes: [],
      supportProfileView: {
        mode: "ready",
        activeCurrency: "JPYC",
        activeProjectId: MOCK_PROJECT_ID,
        projectsByCurrency: {
          JPYC: recruitingProjects[0] ?? null,
          USDC: null,
        },
        draft: null,
      },
      recruitingProjects,
    },
    initialFeed: {
      items: [],
      nextCursor: null,
      limit: 12,
      filters: {
        creatorUsername: username,
        creatorId: MOCK_PROFILE_ID,
        projectId: null,
      },
    },
    credibility: buildCredibility(),
  };
}

export function getE2EMockOwnerAddress(): string {
  return MOCK_OWNER_ADDRESS;
}

export function getE2EMockProjectId(): string {
  return MOCK_PROJECT_ID;
}
