import type { CreatorStageResult } from "@/lib/creatorStage";

export type GrowthMeterScores = {
  creatorSkill: number; // 0-100: 発信力（投稿量 + 継続性）
  pageGrowth: number;   // 0-100: ページ充実度（プロフィール + Goal 設定）
  trust: number;        // 0-100: 信頼（支援者 + AI Office 運用）
  fanEnergy: number;    // 0-100: ファン熱量（支援者基盤）
  opportunity: number;  // 0-100: チャンス（Stage 成熟度 + 実績）
};

type GrowthMeterInput = {
  stageData: CreatorStageResult | null;
  basicProfileComplete: boolean;
  hasProject: boolean;
  hasGoal: boolean;
  approvedTaskCount: number;
};

export function deriveGrowthMeterScores(input: GrowthMeterInput): GrowthMeterScores {
  const m = input.stageData?.maturity ?? null;

  // Creator Skill: 発信量 + 継続性の平均
  const creatorSkill = m ? Math.round((m.output + m.continuity) / 2) : 0;

  // Page Growth: セットアップ完成度 + 実績スコアの加重合計
  const setupScore =
    (input.basicProfileComplete ? 40 : 0) +
    (input.hasProject ? 30 : 0) +
    (input.hasGoal ? 30 : 0);
  const craftBonus = m ? Math.round(m.craft * 0.2) : 0;
  const pageGrowth = Math.min(100, setupScore + craftBonus);

  // Trust: 信頼軸 + 運営軸の平均 + AI Office 利用ボーナス
  const trustBase = m ? Math.round((m.trust + m.operations) / 2) : 0;
  const aiBonus = Math.min(20, input.approvedTaskCount * 4);
  const trust = Math.min(100, trustBase + aiBonus);

  // Fan Energy: 支援者基盤スコア
  const fanEnergy = m ? m.audience : 0;

  // Opportunity: 事業実績 + 実績エビデンスの平均
  const opportunity = m ? Math.round((m.business + m.craft) / 2) : 0;

  return { creatorSkill, pageGrowth, trust, fanEnergy, opportunity };
}
