import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";

export type CreatorStage =
  | "SEED"
  | "EARLY"
  | "EMERGING"
  | "PROFESSIONALIZING"
  | "ESTABLISHED";

export type CreatorMaturityAxes = {
  output: number; // 0-100
  audience: number; // 0-100
  business: number; // 0-100
  continuity: number; // 0-100
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

  // audience: based on contributor count (100 = 100+ unique contributors)
  const audience = clampScore((credibility.totalContributorCount / 100) * 100);

  // business: based on goal achieved (100 = 10+ achievements)
  const business = clampScore((credibility.goalAchievedCount / 10) * 100);

  // continuity: based on active months (100 = 36+ months)
  const continuity = clampScore((credibility.activeMonths / 36) * 100);

  return { output, audience, business, continuity };
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
