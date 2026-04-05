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

export function AiManagerStreakCard({ streak }: Props) {
  const { currentStreak, longestStreak } = streak;

  return (
    <div className="accent-surface-amber rounded-xl px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--warning)]/30 bg-[var(--warning)]/15 text-lg font-bold accent-text-amber">
          {currentStreak > 0 ? currentStreak : "○"}
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            連続達成ストリーク
          </div>
          <div className="text-xs text-[var(--text-subtle)]">
            現在: {currentStreak} 日 / 最長: {longestStreak} 日
          </div>
        </div>
      </div>
      <div className="text-xs accent-text-amber">
        {streakMessage(currentStreak)}
      </div>
    </div>
  );
}
