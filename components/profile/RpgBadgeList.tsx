"use client";
import { useEffect, useState } from "react";

type Badge = {
  badgeCode: string;
  name: string;
  description: string;
  conditionText: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  earned: boolean;
  earnedAt: string | null;
};

const RARITY_COLOR: Record<string, string> = {
  COMMON: "text-gray-600 bg-gray-100",
  RARE: "text-blue-600 bg-blue-100",
  EPIC: "text-purple-600 bg-purple-100",
  LEGENDARY: "text-yellow-600 bg-yellow-100",
};

type Props = { earnedCount: number; totalCount: number };

export function RpgBadgeList({ earnedCount, totalCount }: Props) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    fetch("/api/rpg/badges")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (
          typeof d === "object" &&
          d !== null &&
          "ok" in d &&
          (d as { ok: boolean }).ok &&
          "badges" in d
        ) {
          setBadges((d as { badges: Badge[] }).badges);
        }
      });
  }, []);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">バッジ</h3>
        <span className="text-xs text-[var(--muted)]">{earnedCount} / {totalCount} 獲得</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <div
            key={b.badgeCode}
            className={`rounded-lg p-2 text-xs space-y-1 ${b.earned ? "opacity-100" : "opacity-40 grayscale"}`}
          >
            <div className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${RARITY_COLOR[b.rarity] ?? ""}`}>
              {b.rarity}
            </div>
            <div className="font-semibold text-[var(--text)] dark:text-gray-200">{b.name}</div>
            <div className="text-gray-500">{b.earned ? b.description : b.conditionText}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
