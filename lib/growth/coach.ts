import type { GrowthOverviewData } from "@/lib/growth/overview";

export type GrowthCoachInput = {
  workspaceBasePath: string;
  publicProfileUrl: string;
  basicProfileCompleted: boolean;
  projectCreated: boolean;
  goalSaved: boolean;
  publicPageViewedByOwner: boolean;
  shareDraftsGenerated: boolean;
  growthOverview: GrowthOverviewData | null;
  goalHref?: string;
};

export type GrowthCoachCardModel = {
  stageLabel: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  tone: "amber" | "sky" | "emerald";
};

function settingsHref(basePath: string, hash: string): string {
  return `${basePath}/settings${hash}`;
}

export function buildGrowthCoachCard(
  input: GrowthCoachInput
): GrowthCoachCardModel {
  const metrics = input.growthOverview?.metrics;
  const confirmedContributionCount = metrics?.confirmedContributionCount ?? 0;
  const shareCopiedCount = metrics?.shareCopiedCount ?? 0;
  const shareDraftGeneratedCount = metrics?.shareDraftGeneratedCount ?? 0;
  const sharePostLoggedCount = metrics?.sharePostLoggedCount ?? 0;
  const hasPublicPageView =
    input.publicPageViewedByOwner ||
    (metrics?.ownerPublicPageViewCount ?? 0) > 0;
  const hasShareDraftsGenerated =
    input.shareDraftsGenerated || shareDraftGeneratedCount > 0;

  if (!input.basicProfileCompleted) {
    return {
      stageLabel: "Setup",
      title: "基本プロフィールを先に整える",
      body: "名前、紹介文、アイコン、SNS が揃うと、公開ページの信頼感が一気に上がります。",
      ctaLabel: "基本情報を整える",
      href: settingsHref(input.workspaceBasePath, "#basic-info"),
      tone: "amber",
    };
  }

  if (!input.projectCreated) {
    return {
      stageLabel: "Setup",
      title: "最初の Project を作って支援理由を置く",
      body: "何を応援してほしいのかが見えるだけで、公開ページから支援行動につながりやすくなります。",
      ctaLabel: "Project を作成する",
      href: settingsHref(input.workspaceBasePath, "#project-setup"),
      tone: "amber",
    };
  }

  if (!input.goalSaved) {
    return {
      stageLabel: "Setup",
      title: "Goal を設定して公開導線を完成させる",
      body: "目標金額と用途が見えると、支援者が応援の意味を理解しやすくなります。",
      ctaLabel: "Goal を設定する",
      href: settingsHref(
        input.workspaceBasePath,
        input.goalHref ?? "#goal-input-jpyc"
      ),
      tone: "amber",
    };
  }

  if (!hasPublicPageView) {
    return {
      stageLabel: "Launch",
      title: "公開ページを owner 目線で確認する",
      body: "プロフィール、Goal、見え方を自分で一度確認すると、その後のシェア文面も作りやすくなります。",
      ctaLabel: "公開ページを開く",
      href: input.publicProfileUrl,
      tone: "sky",
    };
  }

  if (!hasShareDraftsGenerated) {
    return {
      stageLabel: "Launch",
      title: "拡散文面を先に用意しておく",
      body: "公開直後は迷わず告知できる状態にしておくと、初速を落とさずに広げられます。",
      ctaLabel: "拡散文面を作る",
      href: settingsHref(input.workspaceBasePath, "#growth-share"),
      tone: "sky",
    };
  }

  if (
    confirmedContributionCount === 0 &&
    sharePostLoggedCount === 0 &&
    shareCopiedCount === 0
  ) {
    return {
      stageLabel: "Launch",
      title: "最初のシェアを 1 回出してみる",
      body: "文面はもう用意できています。まずは 1 回出して、最初の反応を取りにいく段階です。",
      ctaLabel: "拡散文面を開く",
      href: settingsHref(input.workspaceBasePath, "#growth-share"),
      tone: "sky",
    };
  }

  if (confirmedContributionCount === 0 && sharePostLoggedCount === 0) {
    return {
      stageLabel: "Launch",
      title: "投稿した内容を記録しておく",
      body: "コピーや投稿まで進んだら、どこへ出したかを残しておくと、初回支援までの詰まりを見返しやすくなります。",
      ctaLabel: "投稿記録を残す",
      href: settingsHref(input.workspaceBasePath, "#share-log"),
      tone: "sky",
    };
  }

  if (confirmedContributionCount === 0 && sharePostLoggedCount > 0) {
    return {
      stageLabel: "Launch",
      title: "近況を 1 本追加して再シェアする",
      body: "最初の告知のあとに近況投稿が 1 本あると、活動が動いていることが伝わりやすくなります。",
      ctaLabel: "投稿導線を開く",
      href: settingsHref(input.workspaceBasePath, "#posting-compose"),
      tone: "sky",
    };
  }

  if (confirmedContributionCount > 0 && shareDraftGeneratedCount > 0) {
    return {
      stageLabel: "Momentum",
      title: "初回支援を次の支援につなげる",
      body: "最初の支援が入った今が、進捗共有でもう一段広げやすいタイミングです。",
      ctaLabel: "進捗シェア文面を開く",
      href: settingsHref(input.workspaceBasePath, "#growth-share"),
      tone: "emerald",
    };
  }

  return {
    stageLabel: "Momentum",
    title: "公開ページの動きを続けて積み上げる",
    body: "プロフィール、Project、Goal は揃っています。次はシェアと近況更新を繰り返して支援導線を育てます。",
    ctaLabel: "設定・準備を開く",
    href: settingsHref(input.workspaceBasePath, "#growth-share"),
    tone: "emerald",
  };
}
