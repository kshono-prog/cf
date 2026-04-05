"use client";

import type {
  CreatorReadyHomeAction,
  CreatorReadyTaskItem,
} from "@/components/mypage/creatorReadyHomeAiHelpers";

type Props = {
  loading: boolean;
  today: CreatorReadyTaskItem[];
  week: CreatorReadyTaskItem[];
  onOpenSettings: () => void;
};

function priorityBadge(priority: CreatorReadyTaskItem["priority"]): {
  label: string;
  className: string;
} {
  if (priority === "high") {
    return {
      label: "優先",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (priority === "medium") {
    return {
      label: "通常",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "参考",
    className: "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--text-subtle)]",
  };
}

function ownerLabel(owner: CreatorReadyTaskItem["owner"]): string {
  switch (owner) {
    case "CREATOR":   return "自分";
    case "AI_OFFICE": return "AIオフィス";
    case "SHARED":    return "共同";
  }
}

function ActionButton(props: {
  action: CreatorReadyHomeAction;
  onOpenSettings: () => void;
}) {
  if (props.action.kind === "settings") {
    return (
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-[11px]"
        onClick={props.onOpenSettings}
      >
        {props.action.label}
      </button>
    );
  }
  return (
    <a href={props.action.href} className="btn-secondary px-3 py-1.5 text-[11px]">
      {props.action.label}
    </a>
  );
}

function TaskLane(props: {
  title: string;
  description: string;
  items: CreatorReadyTaskItem[];
  loading: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
      <p className="text-sm font-bold text-[var(--text)]">{props.title}</p>
      <p className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">{props.description}</p>

      <div className="mt-3 space-y-2.5">
        {props.loading && props.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
            AIオフィスと現在の進捗から、行動候補を整理しています。
          </div>
        ) : null}

        {props.items.map((item) => {
          const badge = priorityBadge(item.priority);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
            >
              {/* バッジ行 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-subtle)]">
                  {ownerLabel(item.owner)}
                </span>
              </div>

              <p className="mt-2.5 text-sm font-semibold text-[var(--text)]">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                {item.body}
              </p>
              <div className="mt-3">
                <ActionButton action={item.action} onOpenSettings={props.onOpenSettings} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreatorReadyTodayThisWeekSection(props: Props) {
  return (
    <section className="card p-0 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-4 border-b border-[var(--line)]">
        <p className="text-sm font-bold text-[var(--text)]">今日・今週の行動</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">
          状態確認で止まらず、そのまま次の行動に進めるためのフォローアップです。
        </p>
      </div>

      {/* 2レーン */}
      <div className="p-4 grid gap-3 xl:grid-cols-2">
        <TaskLane
          title="今日やること"
          description="まず 1 つ進めるための優先タスクです。"
          items={props.today}
          loading={props.loading}
          onOpenSettings={props.onOpenSettings}
        />
        <TaskLane
          title="今週見ておくこと"
          description="今週のうちに整えると、来週の運営が軽くなる項目です。"
          items={props.week}
          loading={props.loading}
          onOpenSettings={props.onOpenSettings}
        />
      </div>
    </section>
  );
}
