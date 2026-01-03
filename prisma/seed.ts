// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing env: ${name}`);
  }
  return v.trim();
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

  // 重要: ActiveProject は CreatorProfile.activeProjectId が unique のため
  // 既に別projectが刺さっている状態で別projectを作ると制約に引っかかります。
  // ここでは「（1）プロジェクトを作る →（2）activeProjectId をその projectId に更新」
  // を 1トランザクションで実施します。
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
        ownerAddress: walletAddress,
        creatorProfileId: profile.id,
        // defaultChainPolicy / purposeMode は DB 側デフォルトがある前提
      },
      select: { id: true },
    });

    // activeProjectId を上書き（既存があっても更新）
    await tx.creatorProfile.update({
      where: { id: profile.id },
      data: { activeProjectId: project.id },
    });
  });
}

async function main(): Promise<void> {
  await seedFaucet();
  await seedCreatorAndActiveProject();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
  })
  .catch(async (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
