import type {
  SuggestedUiTarget,
  SuggestionContext,
} from "@/lib/creator-ai/nextActionSuggestions";

type NextActionTestCase = {
  name: string;
  input: SuggestionContext;
  expectedTitles: string[];
  expectedTargets: SuggestedUiTarget[];
};

const BASE_SUMMARY = {
  project: {
    id: "project-1",
    status: "OPEN",
    ownerAddress: "0xowner",
    bridgedAt: null,
    distributedAt: null,
  },
  goal: {
    id: "goal-1",
    targetAmount: 1000,
    achievedAt: null,
    deadline: null,
  },
  progress: {
    confirmedAmount: 250,
    targetAmount: 1000,
    progressPct: 25,
  },
  distributionPlan: null,
  lastBridgeRuns: [] as Array<{
    id: string;
    createdAt: string;
  }>,
  lastDistributionRuns: [] as Array<{
    id: string;
    createdAt: string;
    txHashes: unknown;
  }>,
};

export const NEXT_ACTION_TEST_CASES: NextActionTestCase[] = [
  {
    name: "summary missing",
    input: {
      summary: null,
      isOwner: true,
    },
    expectedTitles: [],
    expectedTargets: [],
  },
  {
    name: "no goal",
    input: {
      summary: {
        ...BASE_SUMMARY,
        goal: null,
      },
      isOwner: true,
    },
    expectedTitles: ["Goal を保存してください"],
    expectedTargets: ["goal"],
  },
  {
    name: "below target",
    input: {
      summary: BASE_SUMMARY,
      isOwner: true,
    },
    expectedTitles: ["進捗確認または告知強化を進めてください"],
    expectedTargets: ["summary"],
  },
  {
    name: "target reached but not achieved",
    input: {
      summary: {
        ...BASE_SUMMARY,
        progress: {
          confirmedAmount: 1000,
          targetAmount: 1000,
          progressPct: 100,
        },
      },
      isOwner: true,
    },
    expectedTitles: ["目標達成を確定してください"],
    expectedTargets: ["achieve"],
  },
  {
    name: "achieved but plan missing",
    input: {
      summary: {
        ...BASE_SUMMARY,
        goal: {
          ...BASE_SUMMARY.goal,
          achievedAt: "2026-03-17T00:00:00.000Z",
        },
        progress: {
          confirmedAmount: 1200,
          targetAmount: 1000,
          progressPct: 100,
        },
      },
      isOwner: true,
    },
    expectedTitles: ["Distribution plan を保存してください"],
    expectedTargets: ["plan"],
  },
  {
    name: "bridge incomplete",
    input: {
      summary: {
        ...BASE_SUMMARY,
        goal: {
          ...BASE_SUMMARY.goal,
          achievedAt: "2026-03-17T00:00:00.000Z",
        },
        progress: {
          confirmedAmount: 1200,
          targetAmount: 1000,
          progressPct: 100,
        },
        distributionPlan: {
          recipients: [{ address: "0xrecipient", amount: 1000 }],
        },
      },
      isOwner: true,
    },
    expectedTitles: ["Bridge 準備 / 実行確認を進めてください"],
    expectedTargets: ["bridge"],
  },
  {
    name: "bridge reflected but distribution result missing",
    input: {
      summary: {
        ...BASE_SUMMARY,
        project: {
          ...BASE_SUMMARY.project,
          bridgedAt: "2026-03-17T01:00:00.000Z",
        },
        goal: {
          ...BASE_SUMMARY.goal,
          achievedAt: "2026-03-17T00:00:00.000Z",
        },
        progress: {
          confirmedAmount: 1200,
          targetAmount: 1000,
          progressPct: 100,
        },
        distributionPlan: {
          recipients: [{ address: "0xrecipient", amount: 1000 }],
        },
      },
      isOwner: true,
    },
    expectedTitles: ["Distribution result を保存してください"],
    expectedTargets: ["distributionResult"],
  },
  {
    name: "distribution already saved",
    input: {
      summary: {
        ...BASE_SUMMARY,
        project: {
          ...BASE_SUMMARY.project,
          bridgedAt: "2026-03-17T01:00:00.000Z",
          distributedAt: "2026-03-17T02:00:00.000Z",
        },
        goal: {
          ...BASE_SUMMARY.goal,
          achievedAt: "2026-03-17T00:00:00.000Z",
        },
        progress: {
          confirmedAmount: 1200,
          targetAmount: 1000,
          progressPct: 100,
        },
        distributionPlan: {
          recipients: [{ address: "0xrecipient", amount: 1000 }],
        },
        lastDistributionRuns: [
          {
            id: "distribution-run-1",
            createdAt: "2026-03-17T02:00:00.000Z",
            txHashes: ["0xhash"],
          },
        ],
      },
      isOwner: true,
    },
    expectedTitles: [],
    expectedTargets: [],
  },
];
