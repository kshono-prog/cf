#!/usr/bin/env node

let prisma = null;

function stringifyId(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  return String(value);
}

function printSection(title, rows) {
  console.log("");
  console.log(`## ${title}`);
  if (rows.length === 0) {
    console.log("ok");
    return;
  }

  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
}

async function auditGoalTargetSync() {
  const goals = await prisma.goal.findMany({
    select: {
      id: true,
      projectId: true,
      targetAmount: true,
      targetAmountJpyc: true,
    },
  });

  return goals
    .filter((goal) => goal.targetAmount !== goal.targetAmountJpyc)
    .map((goal) => ({
      goalId: stringifyId(goal.id),
      projectId: stringifyId(goal.projectId),
      targetAmount: goal.targetAmount,
      targetAmountJpyc: goal.targetAmountJpyc,
      issue: "GOAL_TARGET_MISMATCH",
    }));
}

async function auditActiveProjectSlots() {
  const creators = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      username: true,
      activeProjectIdJpyc: true,
      activeProjectIdUsdc: true,
    },
  });

  const slotProjectIds = Array.from(
    new Set(
      creators
        .flatMap((creator) => [
          creator.activeProjectIdJpyc,
          creator.activeProjectIdUsdc,
        ])
        .filter((value) => value !== null)
        .map((value) => value)
    )
  );

  const projects = slotProjectIds.length
    ? await prisma.project.findMany({
        where: {
          id: {
            in: slotProjectIds,
          },
        },
        select: {
          id: true,
          creatorProfileId: true,
          currency: true,
          status: true,
          title: true,
        },
      })
    : [];

  const projectsById = new Map(
    projects.map((project) => [stringifyId(project.id), project])
  );

  const issues = [];

  for (const creator of creators) {
    for (const [slot, projectId, expectedCurrency] of [
      ["JPYC", creator.activeProjectIdJpyc, "JPYC"],
      ["USDC", creator.activeProjectIdUsdc, "USDC"],
    ]) {
      if (!projectId) continue;

      const project = projectsById.get(stringifyId(projectId));
      if (!project) {
        issues.push({
          username: creator.username,
          slot,
          projectId: stringifyId(projectId),
          issue: "ACTIVE_PROJECT_MISSING",
        });
        continue;
      }

      if (project.creatorProfileId !== creator.id) {
        issues.push({
          username: creator.username,
          slot,
          projectId: stringifyId(project.id),
          projectCreatorProfileId:
            project.creatorProfileId === null
              ? null
              : stringifyId(project.creatorProfileId),
          issue: "ACTIVE_PROJECT_OWNER_MISMATCH",
        });
      }

      if (project.currency !== expectedCurrency) {
        issues.push({
          username: creator.username,
          slot,
          projectId: stringifyId(project.id),
          projectCurrency: project.currency,
          issue: "ACTIVE_PROJECT_CURRENCY_MISMATCH",
        });
      }
    }
  }

  return issues;
}

async function auditMissingActiveSlots() {
  const creators = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      username: true,
      activeProjectIdJpyc: true,
      activeProjectIdUsdc: true,
    },
  });

  const creatorIds = creators.map((creator) => creator.id);
  const projects = creatorIds.length
    ? await prisma.project.findMany({
        where: {
          creatorProfileId: {
            in: creatorIds,
          },
          status: {
            notIn: ["DRAFT", "ARCHIVED"],
          },
          currency: {
            in: ["JPYC", "USDC"],
          },
        },
        select: {
          id: true,
          creatorProfileId: true,
          currency: true,
          status: true,
          title: true,
        },
      })
    : [];

  const availabilityByCreator = new Map();
  for (const project of projects) {
    if (project.creatorProfileId === null) continue;
    const key = stringifyId(project.creatorProfileId);
    const current = availabilityByCreator.get(key) ?? { JPYC: false, USDC: false };
    if (project.currency === "JPYC" || project.currency === "USDC") {
      current[project.currency] = true;
      availabilityByCreator.set(key, current);
    }
  }

  const warnings = [];

  for (const creator of creators) {
    const current = availabilityByCreator.get(stringifyId(creator.id));
    if (!current) continue;

    if (current.JPYC && creator.activeProjectIdJpyc === null) {
      warnings.push({
        username: creator.username,
        currency: "JPYC",
        issue: "ACTIVE_PROJECT_SLOT_MISSING",
      });
    }

    if (current.USDC && creator.activeProjectIdUsdc === null) {
      warnings.push({
        username: creator.username,
        currency: "USDC",
        issue: "ACTIVE_PROJECT_SLOT_MISSING",
      });
    }
  }

  return warnings;
}

async function auditPublicProjectsWithoutCreatorProfile() {
  const projects = await prisma.project.findMany({
    where: {
      creatorProfileId: null,
      status: {
        notIn: ["DRAFT", "ARCHIVED"],
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      currency: true,
      ownerAddress: true,
    },
  });

  return projects.map((project) => ({
    projectId: stringifyId(project.id),
    title: project.title,
    status: project.status,
    currency: project.currency,
    ownerAddress: project.ownerAddress,
    issue: "PUBLIC_PROJECT_WITHOUT_CREATOR_PROFILE",
  }));
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
  const strict = process.argv.includes("--strict");

  const [goalTargetMismatches, activeProjectSlotProblems, missingActiveSlots, publicProjectsWithoutCreatorProfile] =
    await Promise.all([
      auditGoalTargetSync(),
      auditActiveProjectSlots(),
      auditMissingActiveSlots(),
      auditPublicProjectsWithoutCreatorProfile(),
    ]);

  const criticalCount =
    goalTargetMismatches.length + activeProjectSlotProblems.length;
  const warningCount =
    missingActiveSlots.length + publicProjectsWithoutCreatorProfile.length;

  console.log("# data integrity audit");
  console.log(`checked_at=${new Date().toISOString()}`);
  console.log(`critical=${criticalCount}`);
  console.log(`warning=${warningCount}`);

  printSection("goal target sync", goalTargetMismatches);
  printSection("active project slots", activeProjectSlotProblems);
  printSection("missing active slots", missingActiveSlots);
  printSection(
    "public projects without creator profile",
    publicProjectsWithoutCreatorProfile
  );

  if (criticalCount > 0 || (strict && warningCount > 0)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("DATA_INTEGRITY_AUDIT_FAILED");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
