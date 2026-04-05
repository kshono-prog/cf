"use client";

import React from "react";
import type { LevelInfo } from "@/lib/gamification/levelSystem";

type Props = {
  levelInfo: LevelInfo;
  displayName: string;
};

export function TodayAchievementCard({ levelInfo, displayName }: Props) {
  const [copied, setCopied] = React.useState(false);

  const creatorName = displayName || "クリエイター";
  const shareText =
    levelInfo.level >= 5
      ? `${creatorName}の Creator Founding 成長レベル MAX 達成！ | creato.jp`
      : `${creatorName}の Creator Founding 成長 Level ${levelInfo.level} | creato.jp`;

  function handleCopy() {
    navigator.clipboard.writeText(shareText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // Clipboard not available — silently ignore
      }
    );
  }

  const remaining = levelInfo.nextLevelXp - levelInfo.xp;
  const isMaxLevel = levelInfo.level >= 5;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
      {/* Header row */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
          Lv.{levelInfo.level}
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {creatorName} の成長レベル
          </div>
          <div className="text-xs text-[var(--text-subtle)]">
            {levelInfo.xp} XP
            {isMaxLevel
              ? " — 最大レベル達成"
              : ` — 次まで ${remaining} XP`}
          </div>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
          style={{ width: `${levelInfo.progressPct}%` }}
        />
      </div>

      {/* Next unlock hint */}
      {levelInfo.nextUnlock ? (
        <div className="mb-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-2.5 py-1.5 text-[11px] text-[var(--accent)]">
          次の解放: {levelInfo.nextUnlock}
        </div>
      ) : null}

      {/* SNS share row */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[11px] text-[var(--text-subtle)]">
          {shareText}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-sm shrink-0"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
    </div>
  );
}
