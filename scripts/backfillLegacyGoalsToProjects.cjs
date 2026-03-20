/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function resolveUsersFilePath() {
  const custom = process.env.LEGACY_USERS_JSON;
  if (custom && custom.trim()) {
    return path.resolve(process.cwd(), custom.trim());
  }

  return path.join(process.cwd(), "data", "users.json");
}

function readLegacyUsers(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`LEGACY_USERS_JSON_NOT_FOUND: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseGoalTargetAmount(data) {
  if (typeof data.goalTargetJpyc !== "number" || !Number.isFinite(data.goalTargetJpyc)) {
    return null;
  }

  const amount = Math.floor(data.goalTargetJpyc);
  return amount > 0 ? amount : null;
}

function parseGoalDeadline(data) {
  if (typeof data.goalDeadline !== "string" || data.goalDeadline.trim().length === 0) {
    return null;
  }

  const parsed = new Date(data.goalDeadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveTargetProjectId(profile, preferredCurrency) {
  if (preferredCurrency === "USDC" && profile.activeProjectIdUsdc) {
    return profile.activeProjectIdUsdc;
  }
  if (preferredCurrency !== "USDC" && profile.activeProjectIdJpyc) {
    return profile.activeProjectIdJpyc;
  }
  if (profile.activeProjectIdJpyc) return profile.activeProjectIdJpyc;
  if (profile.activeProjectIdUsdc) return profile.activeProjectIdUsdc;

  const latestProject = await prisma.project.findFirst({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return latestProject?.id ?? null;
}

async function main() {
  const filePath = resolveUsersFilePath();
  const users = readLegacyUsers(filePath);
  const entries = Object.entries(users);
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [username, rawData] of entries) {
    const data =
      rawData && typeof rawData === "object" ? rawData : {};
    const targetAmount = parseGoalTargetAmount(data);

    if (targetAmount === null) {
      skippedCount += 1;
      continue;
    }

    const profile = await prisma.creatorProfile.findUnique({
      where: { username },
      select: {
        id: true,
        activeProjectIdJpyc: true,
        activeProjectIdUsdc: true,
      },
    });

    if (!profile) {
      console.warn(`skip ${username}: creator profile not found`);
      skippedCount += 1;
      continue;
    }

    const preferredCurrency = data.projectCurrency === "USDC" ? "USDC" : "JPYC";
    const projectId = await resolveTargetProjectId(profile, preferredCurrency);

    if (!projectId) {
      console.warn(`skip ${username}: no project found for backfill`);
      skippedCount += 1;
      continue;
    }

    if (typeof data.goalTitle === "string" && data.goalTitle.trim().length > 0) {
      console.warn(
        `note ${username}: goalTitle is no longer stored separately; only target amount/deadline were backfilled`
      );
    }

    await prisma.goal.upsert({
      where: { projectId },
      update: {
        targetAmount,
        targetAmountJpyc: targetAmount,
        deadline: parseGoalDeadline(data),
      },
      create: {
        projectId,
        targetAmount,
        targetAmountJpyc: targetAmount,
        deadline: parseGoalDeadline(data),
        settlementPolicy: {},
      },
    });

    updatedCount += 1;
    console.log(`backfilled ${username} -> project ${projectId.toString()}`);
  }

  console.log(
    `legacy goal backfill finished: updated=${updatedCount} skipped=${skippedCount}`
  );
}

main()
  .catch((error) => {
    console.error("LEGACY_GOAL_BACKFILL_FAILED", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
