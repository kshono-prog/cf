// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { buildCreatorProjectActivationFields } from "@/lib/creatorProjectActivation";
import { parseSeedProjectConfig } from "./seedConfig";

const prisma = new PrismaClient();

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function optionalEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : null;
}

async function seedFaucet(): Promise<void> {
  const chainIdStr = optionalEnv("SEED_CHAIN_ID") ?? "137";
  const chainId = Number(chainIdStr);
  if (!Number.isFinite(chainId)) {
    throw new Error(`Invalid SEED_CHAIN_ID: ${chainIdStr}`);
  }

  // 例: "0.02"
  const claimAmountPol = optionalEnv("SEED_CLAIM_AMOUNT_POL") ?? "0.02";

  // FaucetConfig: id固定（チェーンごとに固定してもよいが、ここでは単一運用を想定）
  // ※ あなたのDB定義では FaucetConfig.id は TEXT で必須、chainId は unique
  await prisma.faucetConfig.upsert({
    where: { chainId },
    update: {
      enabled: true,
      minJpyc: 100,
      requirePolZero: true,
      claimAmountPol,
      nonceTtlMinutes: 10,
    },
    create: {
      id: "default",
      chainId,
      enabled: true,
      minJpyc: 100,
      requirePolZero: true,
      claimAmountPol,
      nonceTtlMinutes: 10,
    },
  });

  const faucetWalletAddressRaw = optionalEnv("SEED_FAUCET_WALLET_ADDRESS");
  if (faucetWalletAddressRaw) {
    const faucetWalletAddress = normalizeAddress(faucetWalletAddressRaw);

    // FaucetWallet: address が unique なので where は address を使う
    await prisma.faucetWallet.upsert({
      where: { address: faucetWalletAddress },
      update: {
        chainId,
        label: "faucet",
        active: true,
      },
      create: {
        id: "faucet-1",
        chainId,
        address: faucetWalletAddress,
        label: "faucet",
        active: true,
      },
    });
  }
}

async function seedCreatorAndActiveProject(): Promise<void> {
  const walletRaw = optionalEnv("SEED_CREATOR_WALLET_ADDRESS");
  if (!walletRaw) return;

  const walletAddress = normalizeAddress(walletRaw);

  const username = optionalEnv("SEED_CREATOR_USERNAME") ?? "seed_creator";
  const displayName =
    optionalEnv("SEED_CREATOR_DISPLAY_NAME") ?? "Seed Creator";

  const projectTitle = optionalEnv("SEED_PROJECT_TITLE") ?? "Seed Project";
  const projectDescription =
    optionalEnv("SEED_PROJECT_DESCRIPTION") ?? "Seeded project for development";
  const seedProjectConfig = parseSeedProjectConfig(process.env);
  const projectCurrency = seedProjectConfig.currency;
  const projectPurposeMode = seedProjectConfig.purposeMode;
  const goalTargetAmount = seedProjectConfig.goalTargetAmount;
  const goalDeadline = seedProjectConfig.goalDeadline;

  // 1) CreatorProfile を用意
  // 2) Project を作成
  // 3) 通貨別 activeProjectId を更新
  // 4) 必要なら Goal を作成
  await prisma.$transaction(async (tx) => {
    const profile = await tx.creatorProfile.upsert({
      where: { walletAddress },
      update: {
        username,
        displayName,
        status: "PUBLISHED",
      },
      create: {
        username,
        displayName,
        walletAddress,
        status: "PUBLISHED",
      },
    });

    const project = await tx.project.create({
      data: {
        title: projectTitle,
        description: projectDescription,
        status: "DRAFT",
        purposeMode: projectPurposeMode,
        currency: projectCurrency,
        ownerAddress: walletAddress,
        creatorProfileId: profile.id,
      },
      select: { id: true },
    });

    await tx.creatorProfile.update({
      where: { id: profile.id },
      data: buildCreatorProjectActivationFields({
        projectId: project.id,
        currency: projectCurrency,
      }),
    });

    if (goalTargetAmount !== null) {
      await tx.goal.upsert({
        where: { projectId: project.id },
        update: {
          targetAmount: goalTargetAmount,
          targetAmountJpyc: goalTargetAmount,
          deadline: goalDeadline,
        },
        create: {
          projectId: project.id,
          targetAmount: goalTargetAmount,
          targetAmountJpyc: goalTargetAmount,
          deadline: goalDeadline,
        },
      });
    }
  });
}

async function main(): Promise<void> {
  await seedFaucet();
  await seedCreatorAndActiveProject();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (e: unknown) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
