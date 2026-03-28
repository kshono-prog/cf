import { Prisma } from "@prisma/client";

import { generateJson } from "@/lib/ai";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";
import type { CreatorMaturityAxes } from "@/lib/creatorStage";

type GrowthStep = {
  step: number;
  axis: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

const AXIS_LABELS: Record<keyof CreatorMaturityAxes, string> = {
  output: "発信力（投稿数）",
  audience: "支援者基盤",
  business: "事業実績（目標達成）",
  continuity: "継続性（活動期間）",
  craft: "実績・エビデンス",
  operations: "運営体制",
  trust: "信頼・リピート支援者",
  team: "チーム形成",
};

const AXIS_GROWTH_ADVICE: Record<
  keyof CreatorMaturityAxes,
  { title: string; description: string }
> = {
  output: {
    title: "投稿ペースを週1件に引き上げる",
    description:
      "発信スコアを高めるには継続的な投稿が有効です。内容は短くてもよいので、週1件の定期発信を習慣にしましょう。",
  },
  audience: {
    title: "支援者との接点を増やす",
    description:
      "支援者数を伸ばすには、公開ページの整備と告知の工夫が効果的です。ファン向けのメッセージや進捗報告を定期的に行いましょう。",
  },
  business: {
    title: "次の目標設定と達成を目指す",
    description:
      "目標達成実績が事業スコアを引き上げます。現在の進捗を確認し、達成可能な目標金額と期日を設定しましょう。",
  },
  continuity: {
    title: "月1件以上の継続投稿を3ヶ月続ける",
    description:
      "継続性スコアは活動期間に連動します。小さくても定期的な活動記録が積み上がると、信頼性の基盤が育ちます。",
  },
  craft: {
    title: "実績をエビデンスとして記録する",
    description:
      "ライブ出演、受賞、メディア掲載などの実績をマネージャーと一緒にエビデンスとして残しましょう。積み重ねがステージ評価の根拠になります。",
  },
  operations: {
    title: "外部接点と会議を増やして運営体制を整える",
    description:
      "会場・主催者・ブランドとのコンタクトを記録し、定期的なミーティングを設定しましょう。運営の構造化がプロ化への第一歩です。",
  },
  trust: {
    title: "リピート支援者との関係を深める",
    description:
      "複数回支援してくれるファンがいる場合、特別なメッセージや進捗報告で関係を深めましょう。信頼スコアの向上につながります。",
  },
  team: {
    title: "プロジェクトにメンバーを加える",
    description:
      "協力者やアドバイザーをプロジェクトメンバーとして記録しましょう。チーム体制が整うことで、より大きな機会への準備ができます。",
  },
};

export async function buildStageGrowthPlanOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const credibility = await getCreatorActivityCredibility(params.creatorProfileId);
  const stageResult = deriveCreatorStage(credibility);
  const { maturity } = stageResult;

  // Identify weakest and secondary axis across all 8 axes
  const axes = Object.keys(maturity) as (keyof CreatorMaturityAxes)[];
  const weakestAxis = axes.reduce((minAxis, axis) =>
    maturity[axis] < maturity[minAxis] ? axis : minAxis
  );

  const secondaryAxis = axes
    .filter((a) => a !== weakestAxis)
    .reduce((minAxis, axis) =>
      maturity[axis] < maturity[minAxis] ? axis : minAxis
    );

  const steps: GrowthStep[] = [];

  const primaryAdvice = AXIS_GROWTH_ADVICE[weakestAxis];
  steps.push({
    step: 1,
    axis: weakestAxis,
    title: primaryAdvice.title,
    description: primaryAdvice.description,
    priority: "high",
  });

  const secondaryAdvice = AXIS_GROWTH_ADVICE[secondaryAxis];
  steps.push({
    step: 2,
    axis: secondaryAxis,
    title: secondaryAdvice.title,
    description: secondaryAdvice.description,
    priority: "medium",
  });

  // Stage-specific step
  if (stageResult.nextMilestone) {
    steps.push({
      step: 3,
      axis: "stage",
      title: "次のステージに向けた集中ポイント",
      description: stageResult.nextMilestone,
      priority: "medium",
    });
  }

  const weakestLabel = AXIS_LABELS[weakestAxis] ?? weakestAxis;
  const fallbackSummary = `現在のステージ「${stageResult.stageLabel}」において、最も伸びしろがある「${weakestLabel}」を中心に成長ステップを整理しました。`;

  const maturityLines = (Object.entries(maturity) as [keyof CreatorMaturityAxes, number][])
    .map(([axis, score]) => `- ${AXIS_LABELS[axis]}: ${score.toString()}`)
    .join("\n");

  const aiResult = await generateJson<{
    summary: string;
    growthSteps: GrowthStep[];
  }>(
    `クリエイターの成長プランを作成してください。
現在のステージ: ${stageResult.stageLabel}（${stageResult.stageDescription}）
成熟度スコア（0-100）:
${maturityLines}

最も低いスコアの軸: ${weakestLabel}（${maturity[weakestAxis].toString()}点）

このクリエイターが現在のステージから前進するための具体的な成長ステップを3つ提案してください。
特に最も低いスコアの軸を改善するステップを優先してください。

以下のJSON形式のみで返してください:
{"summary":"現状と成長方針の一文","growthSteps":[{"step":1,"axis":"${weakestAxis}","title":"ステップタイトル","description":"具体的な説明（2文以内）","priority":"high"},{"step":2,"axis":"${secondaryAxis}","title":"...","description":"...","priority":"medium"},{"step":3,"axis":"stage","title":"...","description":"...","priority":"medium"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターの成長戦略アドバイザーです。データに基づいた具体的で実行可能なアドバイスを日本語で返してください。",
      maxTokens: 512,
      temperature: 0.7,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    stage: stageResult.stage,
    stageLabel: stageResult.stageLabel,
    stageDescription: stageResult.stageDescription,
    maturity,
    weakestAxis,
    nextMilestone: stageResult.nextMilestone,
    growthSteps:
      aiResult?.growthSteps?.length ? aiResult.growthSteps : steps,
    context: {
      activeMonths: credibility.activeMonths,
      totalPostCount: credibility.totalPostCount,
      goalAchievedCount: credibility.goalAchievedCount,
      totalContributorCount: credibility.totalContributorCount,
    },
    basedOn: params.input,
  };
}
