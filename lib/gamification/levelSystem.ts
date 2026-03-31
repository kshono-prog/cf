import type { GrowthMeterScores } from "@/lib/gamification/growthMeter";

export type LevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number;
  progressPct: number;
  nextUnlock: string | null;
};

// 各軸の重み（合計 5.5 → max XP = 550 → 1500 にスケール）
const AXIS_WEIGHTS: Record<keyof GrowthMeterScores, number> = {
  creatorSkill: 1.2,
  pageGrowth:   1.0,
  trust:        1.5,
  fanEnergy:    1.0,
  opportunity:  0.8,
};

const MAX_RAW = 100 * (1.2 + 1.0 + 1.5 + 1.0 + 0.8); // 550
const MAX_XP = 1500;

// level → min XP 閾値
const LEVEL_THRESHOLDS: number[] = [0, 100, 300, 700, 1500];

// level（1 始まり）→ 解放機能（そのレベルに達した時点で解放）
const LEVEL_UNLOCKS: (string | null)[] = [
  null,
  "投稿テンプレ拡張（カテゴリ別）",
  "AI 提案精度 UP",
  "サポーター分析（Fan Energy 詳細）",
  "仕事接続機能（Opportunity CRM 強化）",
];

export function calcXp(scores: GrowthMeterScores): number {
  const raw =
    scores.creatorSkill * AXIS_WEIGHTS.creatorSkill +
    scores.pageGrowth   * AXIS_WEIGHTS.pageGrowth +
    scores.trust        * AXIS_WEIGHTS.trust +
    scores.fanEnergy    * AXIS_WEIGHTS.fanEnergy +
    scores.opportunity  * AXIS_WEIGHTS.opportunity;
  return Math.round((raw / MAX_RAW) * MAX_XP);
}

export function calcLevel(xp: number): LevelInfo {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? 0)) {
      level = i + 1;
      break;
    }
  }
  level = Math.min(level, LEVEL_THRESHOLDS.length);

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? MAX_XP;

  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const progressPct = isMaxLevel
    ? 100
    : Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

  const nextUnlock = !isMaxLevel ? (LEVEL_UNLOCKS[level] ?? null) : null;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    progressPct: Math.min(100, Math.max(0, progressPct)),
    nextUnlock,
  };
}
