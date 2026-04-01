"use client";
import { useEffect, useState } from "react";
import { RpgHeader } from "./RpgHeader";
import { RpgBadgeList } from "./RpgBadgeList";
import { RpgActivityLog } from "./RpgActivityLog";
import { RpgStatsRadar } from "./RpgStatsRadar";
import { RpgPrivacySettings } from "./RpgPrivacySettings";
import { RpgTitleSelector } from "./RpgTitleSelector";
import { RpgLevelUpModal } from "./RpgLevelUpModal";

type RpgStats = {
  supportPower: number;
  consistency: number;
  discovery: number;
  empathy: number;
  growth: number;
};

type Privacy = {
  showLevel: boolean;
  showTotalSupportAmount: boolean;
  showActivityLog: boolean;
  showBadges: boolean;
};

type RpgProfileData = {
  userId: string;
  displayName: string;
  level: number;
  currentExp: number;
  nextLevelExp: number | null;
  expProgressRate: number;
  titleCode: string | null;
  stats: RpgStats;
  badgeSummary: { earnedCount: number; totalCount: number };
  privacy: Privacy;
};

type ApiResponse = { ok: boolean } & RpgProfileData;

type Tab = "profile" | "settings";

export function RpgProfileTab() {
  const [data, setData] = useState<RpgProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/rpg/profile")
      .then((r) => r.json())
      .then((d: unknown) => {
        const resp = d as ApiResponse;
        if (resp.ok) setData(resp);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-4 text-center text-sm text-gray-400">読み込み中...</div>;
  if (!data) return <div className="p-4 text-center text-sm text-gray-400">データを取得できませんでした</div>;

  return (
    <div className="flex flex-col gap-4 pb-8" id="rpg-profile">
      {levelUpModal !== null && (
        <RpgLevelUpModal newLevel={levelUpModal} onClose={() => setLevelUpModal(null)} />
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {(["profile", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t === "profile" ? "プロフィール" : "設定"}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="flex flex-col gap-4">
          <RpgHeader
            level={data.level}
            currentExp={data.currentExp}
            nextLevelExp={data.nextLevelExp}
            expProgressRate={data.expProgressRate}
            titleCode={data.titleCode}
          />
          <RpgStatsRadar stats={data.stats} />
          <RpgBadgeList
            earnedCount={data.badgeSummary.earnedCount}
            totalCount={data.badgeSummary.totalCount}
          />
          <RpgActivityLog />
        </div>
      )}

      {tab === "settings" && (
        <div className="flex flex-col gap-4">
          <RpgTitleSelector
            currentTitleCode={data.titleCode}
            currentLevel={data.level}
            onChanged={() => load()}
          />
          <RpgPrivacySettings
            initial={data.privacy}
            onSaved={() => load()}
          />
        </div>
      )}
    </div>
  );
}
