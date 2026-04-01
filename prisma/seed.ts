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

async function seedRpgMasterData(): Promise<void> {
  // Level requirements
  const levelReqs: Array<{ level: number; requiredExp: number }> = [
    { level: 1, requiredExp: 100 },
    { level: 2, requiredExp: 150 },
    { level: 3, requiredExp: 220 },
    { level: 4, requiredExp: 300 },
  ];
  let prev = 300;
  for (let lv = 5; lv <= 49; lv++) {
    prev = Math.ceil(prev * 1.15);
    levelReqs.push({ level: lv, requiredExp: prev });
  }
  for (const req of levelReqs) {
    await prisma.rpgLevelRequirement.upsert({
      where: { level: req.level },
      update: { requiredExp: req.requiredExp },
      create: req,
    });
  }

  // EXP rules
  const expRules = [
    { eventType: "LOGIN_DAILY", baseExp: 10, dailyLimitCount: 1, description: "ログイン（1日1回）" },
    { eventType: "PROJECT_VIEWED", baseExp: 2, dailyLimitCount: 5, description: "プロジェクト閲覧" },
    { eventType: "SUPPORT_CREATED", baseExp: 30, dailyLimitCount: null, description: "支援実行" },
    { eventType: "COMMENT_CREATED", baseExp: 10, dailyLimitCount: 3, description: "コメント投稿" },
    { eventType: "REACTION_ADDED", baseExp: 2, dailyLimitCount: 10, description: "リアクション" },
    { eventType: "SUPPORT_STREAK_BONUS", baseExp: 40, dailyLimitCount: null, description: "週連続支援ボーナス" },
    { eventType: "SUPPORTED_PROJECT_GOAL_REACHED", baseExp: 80, dailyLimitCount: null, description: "支援案件の目標達成に立ち会い" },
  ];
  for (const rule of expRules) {
    await prisma.rpgExpRule.upsert({
      where: { eventType: rule.eventType },
      update: rule,
      create: { ...rule, enabled: true },
    });
  }

  // Badges (10 initial)
  const badges = [
    { badgeCode: "FIRST_SUPPORT", nameJa: "はじめの一歩", descriptionJa: "初めて支援した", conditionTextJa: "初回支援を1回行う", rarity: "COMMON" as const, sortOrder: 1 },
    { badgeCode: "LOGIN_3DAYS", nameJa: "3日ぼうず卒業", descriptionJa: "3日連続ログイン", conditionTextJa: "3日連続ログインする", rarity: "COMMON" as const, sortOrder: 2 },
    { badgeCode: "LOGIN_7DAYS", nameJa: "コツコツ応援団", descriptionJa: "7日連続ログイン", conditionTextJa: "7日連続ログインする", rarity: "COMMON" as const, sortOrder: 3 },
    { badgeCode: "NEW_PROJECT_3", nameJa: "新規発掘隊", descriptionJa: "公開7日以内の案件を3件支援", conditionTextJa: "公開7日以内の案件を3件支援する", rarity: "RARE" as const, sortOrder: 4 },
    { badgeCode: "COMMENT_10", nameJa: "ひとこと名人", descriptionJa: "コメント10件", conditionTextJa: "コメントを10件投稿する", rarity: "COMMON" as const, sortOrder: 5 },
    { badgeCode: "REACTION_50", nameJa: "リアクション王", descriptionJa: "リアクション50回", conditionTextJa: "リアクションを50回行う", rarity: "COMMON" as const, sortOrder: 6 },
    { badgeCode: "GOAL_WITNESS", nameJa: "達成の立会人", descriptionJa: "支援案件が1件達成", conditionTextJa: "支援した案件が1件目標達成する", rarity: "RARE" as const, sortOrder: 7 },
    { badgeCode: "SUPPORT_5", nameJa: "まごころサポーター", descriptionJa: "累計支援5回", conditionTextJa: "累計5回支援する", rarity: "COMMON" as const, sortOrder: 8 },
    { badgeCode: "SAME_PROJECT_3", nameJa: "見守り上手", descriptionJa: "同一案件に3回支援", conditionTextJa: "同じプロジェクトに3回支援する", rarity: "RARE" as const, sortOrder: 9 },
    { badgeCode: "LEVEL_10", nameJa: "推し活職人", descriptionJa: "Lv.10到達", conditionTextJa: "Lv.10に到達する", rarity: "EPIC" as const, sortOrder: 10 },
  ];
  for (const badge of badges) {
    await prisma.rpgBadge.upsert({
      where: { badgeCode: badge.badgeCode },
      update: badge,
      create: { ...badge, enabled: true },
    });
  }

  // Titles
  const titles = [
    { titleCode: "BEGINNER_SUPPORTER", nameJa: "かけだしサポーター", descriptionJa: "はじめての応援", unlockLevel: 1 },
    { titleCode: "OSHIKATSU_CRAFTSMAN", nameJa: "推し活職人", descriptionJa: "Lv.10到達で解放", unlockLevel: 10 },
    { titleCode: "PASSIONATE_FAN", nameJa: "熱烈応援団", descriptionJa: "Lv.20到達で解放", unlockLevel: 20 },
    { titleCode: "LEGEND_SUPPORTER", nameJa: "レジェンドサポーター", descriptionJa: "Lv.30到達で解放", unlockLevel: 30 },
  ];
  for (const title of titles) {
    await prisma.rpgTitle.upsert({
      where: { titleCode: title.titleCode },
      update: title,
      create: { ...title, enabled: true },
    });
  }
}

async function main(): Promise<void> {
  await seedFaucet();
  await seedCreatorAndActiveProject();
  await seedRpgMasterData();
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
