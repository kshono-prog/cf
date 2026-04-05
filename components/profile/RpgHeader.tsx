"use client";

type Props = {
  level: number;
  currentExp: number;
  nextLevelExp: number | null;
  expProgressRate: number;
  titleCode: string | null;
};

const TITLE_NAMES: Record<string, string> = {
  BEGINNER_SUPPORTER: "かけだしサポーター",
  OSHIKATSU_CRAFTSMAN: "推し活職人",
  PASSIONATE_FAN: "熱烈応援団",
  LEGEND_SUPPORTER: "レジェンドサポーター",
};

export function RpgHeader({ level, currentExp, nextLevelExp, expProgressRate, titleCode }: Props) {
  const titleName = titleCode ? (TITLE_NAMES[titleCode] ?? titleCode) : "かけだしサポーター";
  const toNext = nextLevelExp != null ? nextLevelExp - currentExp : null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Lv.{level}</span>
          <span className="ml-2 text-sm text-[var(--muted)] dark:text-[var(--muted)]">{titleName}</span>
        </div>
        <div className="text-right text-xs text-[var(--muted)] dark:text-[var(--muted)]">
          <div>{currentExp.toLocaleString()} EXP</div>
          {nextLevelExp != null && <div>/ {nextLevelExp.toLocaleString()}</div>}
        </div>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-[var(--surface-muted)] dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, expProgressRate)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--muted)]">
          <span>{expProgressRate.toFixed(1)}%</span>
          {toNext != null && <span>次のレベルまで あと {toNext.toLocaleString()} EXP</span>}
        </div>
      </div>
    </div>
  );
}
