"use client";

import type { CreatorReadyQuickAction } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";

type Props = {
  actions: CreatorReadyQuickAction[];
};

export function CreatorReadyQuickActionsSection(props: Props) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">次にやること</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            優先度の高い順に並べています。
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {props.actions.map((action) => (
          <div
            key={action.title}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <div className="text-sm font-semibold text-gray-900">
              {action.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              {action.body}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
              onClick={action.onAction}
            >
              {action.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
