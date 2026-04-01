"use client";

type Stats = {
  supportPower: number;
  consistency: number;
  discovery: number;
  empathy: number;
  growth: number;
};

const LABELS: Array<{ key: keyof Stats; ja: string; hint: string }> = [
  { key: "supportPower", ja: "応援力", hint: "支援額・支援回数" },
  { key: "consistency", ja: "継続力", hint: "連続ログイン・支援" },
  { key: "discovery", ja: "発見力", hint: "新着案件への支援" },
  { key: "empathy", ja: "共感力", hint: "コメント・リアクション" },
  { key: "growth", ja: "育成力", hint: "達成プロジェクト数" },
];

export function RpgStatsRadar({ stats }: { stats: Stats }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">ステータス</h3>
      <p className="text-xs text-gray-400">この値は最近30日の活動をもとに算出しています</p>
      <div className="space-y-2">
        {LABELS.map(({ key, ja, hint }) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{ja}</span>
              <span className="text-gray-500">{stats[key]}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-400 h-2 rounded-full"
                style={{ width: `${stats[key]}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{hint}で上昇</p>
          </div>
        ))}
      </div>
    </div>
  );
}
