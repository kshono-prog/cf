import { Prisma } from "@prisma/client";

import { generateJson } from "@/lib/ai";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage, MATURITY_AXIS_LABELS } from "@/lib/creatorStage";
import type { CreatorMaturityAxes } from "@/lib/creatorStage";

function rankAxes(maturity: CreatorMaturityAxes): { axis: keyof CreatorMaturityAxes; label: string; score: number }[] {
  return (Object.entries(maturity) as [keyof CreatorMaturityAxes, number][])
    .map(([axis, score]) => ({ axis, label: MATURITY_AXIS_LABELS[axis], score }))
    .sort((a, b) => a.score - b.score);
}

export async function buildStageProgressReportOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const credibility = await getCreatorActivityCredibility(params.creatorProfileId);
  const stageResult = deriveCreatorStage(credibility);
  const ranked = rankAxes(stageResult.maturity);

  const weakest = ranked.slice(0, 3);
  const strongest = ranked.slice(-3).reverse();

  const context = {
    stage: stageResult.stage,
    stageLabel: stageResult.stageLabel,
    stageDescription: stageResult.stageDescription,
    nextMilestone: stageResult.nextMilestone,
    maturity: stageResult.maturity,
    weakestAxes: weakest.map((a) => `${a.label}(${a.score.toString()}pt)`).join(", "),
    strongestAxes: strongest.map((a) => `${a.label}(${a.score.toString()}pt)`).join(", "),
    activeMonths: credibility.activeMonths,
    totalPostCount: credibility.totalPostCount,
    totalContributorCount: credibility.totalContributorCount,
    goalAchievedCount: credibility.goalAchievedCount,
  };

  type ReportOutput = {
    summary: string;
    currentStageLabel: string;
    strengths: string[];
    gaps: string[];
    nextMilestone: string | null;
    focusAdvice: string;
  };

  const prompt = `
クリエイターの現在の成長ステージと成熟度軸を診断し、現状レポートを生成してください。

現在ステージ: ${context.stageLabel}（${context.stageDescription}）
活動期間: ${context.activeMonths.toString()}ヶ月
投稿数: ${context.totalPostCount.toString()}件
支援者数: ${context.totalContributorCount.toString()}人
目標達成数: ${context.goalAchievedCount.toString()}回
強い軸: ${context.strongestAxes}
弱い軸: ${context.weakestAxes}
次のマイルストーン: ${context.nextMilestone ?? "なし（最高ステージ到達済み）"}

以下を生成してください:
- summary: 現在の成長状況を2〜3文でまとめた診断サマリー（日本語）
- currentStageLabel: 現在のステージ名
- strengths: 強い点を2〜3項目（日本語の短い文）
- gaps: 伸ばすべき点を2〜3項目（日本語の短い文）
- nextMilestone: 次に達成すべきマイルストーン（なければ null）
- focusAdvice: 今すぐ取り組むべき1つのアクション（日本語の短い文）
`.trim();

  const aiResult = await generateJson<ReportOutput>(prompt).catch(() => null);

  if (aiResult) {
    return {
      summary: aiResult.summary,
      currentStageLabel: aiResult.currentStageLabel,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      nextMilestone: aiResult.nextMilestone,
      focusAdvice: aiResult.focusAdvice,
      maturity: context.maturity,
    };
  }

  // fallback
  return {
    summary: `現在のステージは ${context.stageLabel} です。${context.stageDescription}`,
    currentStageLabel: context.stageLabel,
    strengths: strongest.map((a) => `${a.label}が比較的充実しています（${a.score.toString()}pt）`),
    gaps: weakest.map((a) => `${a.label}の強化が次のステージへの近道です（${a.score.toString()}pt）`),
    nextMilestone: context.nextMilestone,
    focusAdvice: weakest[0] ? `まず「${weakest[0].label}」の軸を重点的に伸ばしましょう。` : "現在のペースを維持してください。",
    maturity: context.maturity,
  };
}
