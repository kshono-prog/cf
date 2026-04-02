"use client";

import type { StreakInfo } from "@/lib/gamification/streakCalc";

type Props = {
  streak: StreakInfo;
};

function streakMessage(current: number): string {
  if (current === 0) return "今日タスクを完了してストリークを始めましょう。";
  if (current === 1) return "ストリーク開始！明日も継続しましょう。";
  if (current < 7) return `${current} 日連続達成中。7 日を目指しましょう！`;
  if (current < 30) return `${current} 日連続！すばらしい継続力です。`;
  return `${current} 日連続！圧倒的な継続力です。`;
}

function flameEmoji(current: number): string {
  if (current === 0) return "○";
  if (current < 3) return "▲";
  if (current < 7) return "★";
  return "★★";
}

export function AiManagerStreakCard({ streak }: Props) {
  const { currentStreak, longestStreak } = streak;

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-400 text-lg font-bold text-white">
          {flameEmoji(currentStreak)}
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            連続達成ストリーク
          </div>
          <div className="text-xs text-[var(--text-subtle)]">
            今日のストリーク: {currentStreak} 日 / 最長: {longestStreak} 日
          </div>
        </div>
      </div>
      <div className="text-xs text-orange-700">
        {streakMessage(currentStreak)}
      </div>
    </div>
  );
}
