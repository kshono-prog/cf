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

function priorityBadgeClass(priority: CreatorReadyTaskItem["priority"]): string {
  if (priority === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (priority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function ownerLabel(owner: CreatorReadyTaskItem["owner"]): string {
  switch (owner) {
    case "CREATOR":
      return "Creator";
    case "AI_OFFICE":
      return "AI Office";
    case "SHARED":
      return "Shared";
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-sm font-semibold text-slate-950">{props.title}</div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{props.description}</p>

      <div className="mt-4 space-y-3">
        {props.loading && props.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-xs text-slate-500">
            AI Office と現在の進捗から、行動候補を整理しています。
          </div>
        ) : null}
        {props.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClass(item.priority)}`}
              >
                {item.priority}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {ownerLabel(item.owner)}
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-950">
              {item.title}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {item.body}
            </div>
            <div className="mt-3">
              <ActionButton
                action={item.action}
                onOpenSettings={props.onOpenSettings}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreatorReadyTodayThisWeekSection(props: Props) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-slate-950">Today / This Week</div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          状態確認で止まらず、そのまま次の行動に進めるためのフォローアップです。
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
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
