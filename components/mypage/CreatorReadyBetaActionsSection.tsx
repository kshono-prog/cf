"use client";

import type { CreatorReadyBetaWorkspaceAction } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";

type Props = {
  actions: CreatorReadyBetaWorkspaceAction[];
};

export function CreatorReadyBetaActionsSection(props: Props) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-amber-950">
            試験中の機能
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            通常使う機能とは別に、試験版の機能や詳しい設定はこちらから確認できます。
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          試験中
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {props.actions.map((action) => (
          <div
            key={action.title}
            className="rounded-2xl border border-amber-200 bg-white/90 p-4"
          >
            <div className="text-sm font-semibold text-amber-950">
              {action.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              {action.body}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-500"
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
