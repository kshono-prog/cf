"use client";

type Props = {
  newLevel: number;
  onClose: () => void;
};

const LEVEL_UNLOCKS: Record<number, string[]> = {
  6: ["ステータスレーダーチャート", "プロフィール背景変更（3種）", "月間ふりかえりレポート"],
  11: ["称号の手動選択", "活動ログのピン留め（1件）", "限定スタンプ（コメント用）"],
  21: ["コミュニティバッジ作成", "応援履歴の詳細分析", "季節イベントクエスト参加権"],
};

function getUnlocks(level: number): string[] {
  if (level >= 21) return LEVEL_UNLOCKS[21];
  if (level >= 11) return LEVEL_UNLOCKS[11];
  if (level >= 6) return LEVEL_UNLOCKS[6];
  return [];
}

export function RpgLevelUpModal({ newLevel, onClose }: Props) {
  const unlocks = getUnlocks(newLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--surface)] dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4 text-center">
        <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
          Lv.{newLevel}
        </div>
        <div className="text-lg font-bold text-[var(--text)] dark:text-gray-200">
          レベルアップ！
        </div>
        {unlocks.length > 0 && (
          <div className="text-left bg-indigo-50 dark:bg-indigo-950 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              新しい機能が解放されました
            </p>
            {unlocks.map((u) => (
              <p key={u} className="text-xs text-indigo-600 dark:text-indigo-400">
                ✓ {u}
              </p>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-[var(--muted)] hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            閉じる
          </button>
          <a
            href="#rpg-profile"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium text-center"
          >
            プロフィールを見る
          </a>
        </div>
      </div>
    </div>
  );
}
