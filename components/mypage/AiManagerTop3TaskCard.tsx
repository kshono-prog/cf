"use client";

import Link from "next/link";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  difficultyStars,
  type AiManagerTop3Task,
} from "@/lib/aiManager/taskMeta";

type Props = {
  task: AiManagerTop3Task;
  index: number;
  onOpenSettings: () => void;
  onInlineAction?: () => void;
};

export function AiManagerTop3TaskCard({ task, index, onOpenSettings, onInlineAction }: Props) {
  const categoryStyle = CATEGORY_COLORS[task.category];

  function handleAction() {
    if (task.actionKind === "settings") {
      onOpenSettings();
    } else if (task.actionKind === "inline") {
      onInlineAction?.();
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-sm">
      {/* ヘッダー行: 番号 + カテゴリ + 難易度 + 時間 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-[11px] font-bold text-[var(--bg)]">
          {index + 1}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${categoryStyle}`}
        >
          {CATEGORY_LABELS[task.category]}
        </span>
        <span className="text-[11px] text-amber-500">
          {difficultyStars(task.difficulty)}
        </span>
        <span className="ml-auto text-[11px] text-[var(--text-subtle)]">
          約 {task.estimatedMinutes} 分
        </span>
      </div>

      {/* タイトル */}
      <div className="mt-2 text-sm font-semibold leading-snug text-[var(--text)]">
        {task.title}
      </div>

      {/* 目的（なぜ今やるか） */}
      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
        {task.purpose}
      </div>

      {/* 完了後の効果 */}
      <div className="mt-2 flex items-start gap-1.5">
        <span className="mt-0.5 text-xs text-emerald-500">✓</span>
        <span className="text-xs leading-5 text-emerald-700">{task.outcomeLabel}</span>
      </div>

      {/* アクション */}
      <div className="mt-3">
        {task.actionKind === "href" && task.href ? (
          <Link href={task.href} className="btn-secondary text-xs py-1.5 px-3">
            {task.actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAction}
            className={`text-xs py-1.5 px-3 ${task.actionKind === "inline" ? "btn" : "btn-secondary"}`}
          >
            {task.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
