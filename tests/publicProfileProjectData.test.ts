import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import {
  derivePublicProfileProjectData,
  type PublicProfileContributionTotals,
  type PublicProfileProjectRow,
} from "../lib/publicProfileProjectData";

function createTotals(
  entries: Array<[string, { JPYC: number; USDC: number }]>
): PublicProfileContributionTotals {
  return new Map(
    entries.map(([projectId, amounts]) => [
      projectId,
      {
        JPYC: new Prisma.Decimal(amounts.JPYC),
        USDC: new Prisma.Decimal(amounts.USDC),
      },
    ])
  );
}

test("derivePublicProfileProjectData prefers explicit active slots and excludes closed or achieved recruiting projects", () => {
  const projects: PublicProfileProjectRow[] = [
    {
      id: 11n,
      creatorProfileId: 1n,
      title: "Newest JPYC",
      description: "latest",
      currency: "JPYC",
      status: "OPEN",
      createdAt: new Date("2026-03-20T00:00:00.000Z"),
      goal: {
        targetAmount: 200,
        targetAmountJpyc: 200,
        achievedAt: null,
        deadline: new Date("2026-04-01T00:00:00.000Z"),
      },
    },
    {
      id: 10n,
      creatorProfileId: 1n,
      title: "Pinned JPYC",
      description: "preferred",
      currency: "JPYC",
      status: "OPEN",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      goal: {
        targetAmount: 100,
        targetAmountJpyc: 100,
        achievedAt: null,
        deadline: null,
      },
    },
    {
      id: 12n,
      creatorProfileId: 1n,
      title: "USDC Open",
      description: "usdc",
      currency: "USDC",
      status: "OPEN",
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      goal: {
        targetAmount: 50,
        targetAmountJpyc: 50,
        achievedAt: null,
        deadline: null,
      },
    },
    {
      id: 13n,
      creatorProfileId: 1n,
      title: "Closed project",
      description: null,
      currency: "JPYC",
      status: "BRIDGED",
      createdAt: new Date("2026-03-18T00:00:00.000Z"),
      goal: {
        targetAmount: 80,
        targetAmountJpyc: 80,
        achievedAt: null,
        deadline: null,
      },
    },
    {
      id: 14n,
      creatorProfileId: 1n,
      title: "Achieved project",
      description: null,
      currency: "USDC",
      status: "OPEN",
      createdAt: new Date("2026-03-17T00:00:00.000Z"),
      goal: {
        targetAmount: 20,
        targetAmountJpyc: 20,
        achievedAt: new Date("2026-03-18T00:00:00.000Z"),
        deadline: null,
      },
    },
  ];

  const result = derivePublicProfileProjectData({
    projects,
    totals: createTotals([
      ["10", { JPYC: 25, USDC: 0 }],
      ["11", { JPYC: 90, USDC: 0 }],
      ["12", { JPYC: 0, USDC: 5 }],
      ["13", { JPYC: 40, USDC: 0 }],
      ["14", { JPYC: 0, USDC: 20 }],
    ]),
    activeProjectIdJpyc: "10",
    activeProjectIdUsdc: "12",
    creator: {
      displayName: "Kazu",
      profile: "creator profile",
    },
  });

  assert.equal(result.projectId, "10");
  assert.deepEqual(result.projectIdsByCurrency, { JPYC: "10", USDC: "12" });
  assert.equal(result.publicSummary?.progress?.confirmedAmount, 25);
  assert.equal(result.publicSummary?.progress?.targetAmount, 100);
  assert.equal(result.supportProfileView.mode, "ready");
  assert.equal(result.supportProfileView.activeCurrency, "JPYC");
  assert.equal(result.recruitingProjects.length, 3);
  assert.deepEqual(
    result.recruitingProjects.map((project) => project.projectId),
    ["11", "10", "12"]
  );
});

test("derivePublicProfileProjectData falls back to the latest available project by currency", () => {
  const projects: PublicProfileProjectRow[] = [
    {
      id: 20n,
      creatorProfileId: 1n,
      title: "Latest USDC",
      description: null,
      currency: "USDC",
      status: "OPEN",
      createdAt: new Date("2026-03-20T00:00:00.000Z"),
      goal: {
        targetAmount: 60,
        targetAmountJpyc: 60,
        achievedAt: null,
        deadline: null,
      },
    },
    {
      id: 19n,
      creatorProfileId: 1n,
      title: "Older USDC",
      description: null,
      currency: "USDC",
      status: "OPEN",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      goal: {
        targetAmount: 40,
        targetAmountJpyc: 40,
        achievedAt: null,
        deadline: null,
      },
    },
  ];

  const result = derivePublicProfileProjectData({
    projects,
    totals: createTotals([["20", { JPYC: 0, USDC: 12 }]]),
    activeProjectIdJpyc: null,
    activeProjectIdUsdc: null,
    creator: {
      displayName: "Kazu",
      profile: "creator profile",
    },
  });

  assert.equal(result.projectId, "20");
  assert.equal(result.supportProfileView.activeCurrency, "USDC");
  assert.equal(result.publicSummary?.progress?.confirmedAmount, 12);
});

test("derivePublicProfileProjectData returns draft mode when no active projects exist", () => {
  const result = derivePublicProfileProjectData({
    projects: [],
    totals: createTotals([]),
    activeProjectIdJpyc: null,
    activeProjectIdUsdc: null,
    creator: {
      displayName: "Kazu",
      profile: "準備中プロフィール",
    },
  });

  assert.equal(result.projectId, null);
  assert.equal(result.supportProfileView.mode, "draft");
  assert.equal(result.supportProfileView.draft?.description, "準備中プロフィール");
  assert.equal(result.publicSummary, null);
  assert.deepEqual(result.recruitingProjects, []);
});
