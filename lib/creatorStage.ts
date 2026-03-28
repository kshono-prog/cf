import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";

export type CreatorStage =
  | "SEED"
  | "EARLY"
  | "EMERGING"
  | "PROFESSIONALIZING"
  | "ESTABLISHED";

export type CreatorMaturityAxes = {
  output: number;      // 0-100: 発信量（投稿数）
  audience: number;    // 0-100: 支援者基盤（ユニーク支援者数）
  business: number;    // 0-100: 事業実績（目標達成数）
  continuity: number;  // 0-100: 継続性（活動期間）
  craft: number;       // 0-100: 実績・エビデンス（ステージエビデンス数）
  operations: number;  // 0-100: 運営体制（会議・外部接点・マネージャーノート）
  trust: number;       // 0-100: 信頼・リピート（複数回支援者数）
  team: number;        // 0-100: チーム形成（アクティブメンバー数）
};

export const MATURITY_AXIS_LABELS: Record<keyof CreatorMaturityAxes, string> = {
  output: "発信量",
  audience: "支援者",
  business: "目標達成",
  continuity: "継続性",
  craft: "実績",
  operations: "運営",
  trust: "信頼",
  team: "チーム",
};

export type CreatorStageResult = {
  stage: CreatorStage;
  stageLabel: string;
  stageDescription: string;
  nextMilestone: string | null;
  maturity: CreatorMaturityAxes;
};

const STAGE_LABELS: Record<CreatorStage, string> = {
  SEED: "Seed",
  EARLY: "Early",
  EMERGING: "Emerging",
  PROFESSIONALIZING: "Professionalizing",
  ESTABLISHED: "Established",
};

const STAGE_DESCRIPTIONS: Record<CreatorStage, string> = {
  SEED: "活動を始めたばかりです。最初の投稿と記録を積み上げましょう。",
  EARLY: "継続的な活動が始まっています。発信と関係構築を続けましょう。",
  EMERGING: "支援者と実績が育ち始めています。目標設定と定期発信を強めましょう。",
  PROFESSIONALIZING: "本格的な活動基盤が整っています。チームと外部接点を広げる時期です。",
  ESTABLISHED: "安定した実績と信頼を持つ Creator です。",
};

function nextMilestoneFor(
  stage: CreatorStage,
  credibility: CreatorActivityCredibility
): string | null {
  switch (stage) {
    case "SEED": {
      if (credibility.totalPostCount < 5) {
        return `あと ${5 - credibility.totalPostCount} 件の公開投稿で Early へ`;
      }
      return `継続して 3 ヶ月活動すると Early へ`;
    }
    case "EARLY": {
      if (credibility.totalPostCount < 20) {
        return `あと ${20 - credibility.totalPostCount} 件の投稿で Emerging へ近づきます`;
      }
      if (credibility.goalAchievedCount === 0) {
        return "最初の目標を達成すると Emerging へ";
      }
      return "6 ヶ月継続で Emerging へ";
    }
    case "EMERGING": {
      if (credibility.goalAchievedCount < 2) {
        return `あと ${2 - credibility.goalAchievedCount} 目標達成で Professionalizing へ近づきます`;
      }
      if (credibility.totalContributorCount < 20) {
        return `支援者があと ${20 - credibility.totalContributorCount} 人増えると Professionalizing へ`;
      }
      return "12 ヶ月の実績で Professionalizing へ";
    }
    case "PROFESSIONALIZING": {
      const needed: string[] = [];
      if (credibility.goalAchievedCount < 5) {
        needed.push(`目標達成 ${5 - credibility.goalAchievedCount} 回`);
      }
      if (credibility.totalPostCount < 100) {
        needed.push(`投稿 ${100 - credibility.totalPostCount} 件`);
      }
      if (needed.length > 0) {
        return `Established まで: ${needed.join(" / ")}`;
      }
      return "24 ヶ月の継続実績で Established へ";
    }
    case "ESTABLISHED":
      return null;
  }
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function deriveMaturity(
  credibility: CreatorActivityCredibility
): CreatorMaturityAxes {
  // output: based on post count (100 = 200+ posts)
  const output = clampScore((credibility.totalPostCount / 200) * 100);

  // audience: based on unique contributor count (100 = 100+ contributors)
  const audience = clampScore((credibility.totalContributorCount / 100) * 100);

  // business: based on goal achieved (100 = 10+ achievements)
  const business = clampScore((credibility.goalAchievedCount / 10) * 100);

  // continuity: based on active months (100 = 36+ months)
  const continuity = clampScore((credibility.activeMonths / 36) * 100);

  // craft: based on stage evidence records (100 = 10+ records)
  const craft = clampScore((credibility.stageEvidenceCount / 10) * 100);

  // operations: weighted mix of meetings (40%), contacts (40%), notes (20%)
  const meetingScore = Math.min(40, (credibility.meetingCount / 10) * 40);
  const contactScore = Math.min(40, (credibility.externalContactCount / 10) * 40);
  const noteScore = Math.min(20, (credibility.managerNoteCount / 20) * 20);
  const operations = clampScore(meetingScore + contactScore + noteScore);

  // trust: based on repeat supporters (100 = 10+ supporters who gave multiple times)
  const trust = clampScore((credibility.repeatSupporterCount / 10) * 100);

  // team: based on active project members excluding owner (100 = 5+ members)
  const team = clampScore((credibility.activeProjectMemberCount / 5) * 100);

  return { output, audience, business, continuity, craft, operations, trust, team };
}

export function deriveCreatorStage(
  credibility: CreatorActivityCredibility
): CreatorStageResult {
  const { activeMonths, totalPostCount, goalAchievedCount, totalContributorCount } =
    credibility;

  let stage: CreatorStage;

  if (
    activeMonths >= 24 &&
    totalPostCount >= 100 &&
    goalAchievedCount >= 5 &&
    totalContributorCount >= 50
  ) {
    stage = "ESTABLISHED";
  } else if (
    activeMonths >= 12 &&
    totalPostCount >= 50 &&
    goalAchievedCount >= 2 &&
    totalContributorCount >= 20
  ) {
    stage = "PROFESSIONALIZING";
  } else if (
    activeMonths >= 6 &&
    totalPostCount >= 20 &&
    (goalAchievedCount > 0 || totalContributorCount >= 5)
  ) {
    stage = "EMERGING";
  } else if (activeMonths >= 3 && totalPostCount >= 5) {
    stage = "EARLY";
  } else {
    stage = "SEED";
  }

  return {
    stage,
    stageLabel: STAGE_LABELS[stage],
    stageDescription: STAGE_DESCRIPTIONS[stage],
    nextMilestone: nextMilestoneFor(stage, credibility),
    maturity: deriveMaturity(credibility),
  };
}
