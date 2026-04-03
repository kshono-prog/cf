"use client";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import type {
  GrowthCompletedItem,
  GrowthImprovementItem,
  GrowthOngoingItem,
  GrowthReflectionData,
} from "@/lib/operations/growthReflectionTypes";

type Props = {
  loading: boolean;
  error: string | null;
  data: GrowthReflectionData | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function OngoingCard(props: { item: GrowthOngoingItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
        {props.item.label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
        {props.item.value}
      </div>
      <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
        {props.item.note}
      </div>
    </div>
  );
}

function CompletedRow(props: { item: GrowthCompletedItem }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
        ✓
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-950">
            {props.item.label}
          </span>
          {props.item.occurredAt ? (
            <span className="text-[11px] text-slate-400">
              {formatDate(props.item.occurredAt)}
            </span>
          ) : null}
        </div>
        {props.item.summary ? (
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            {props.item.summary}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function ImprovementRow(props: { item: GrowthImprovementItem }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
        →
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-950">
          {props.item.label}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">
          {props.item.reason}
        </p>
      </div>
    </li>
  );
}

export function CreatorReadyGrowthReflectionSection(props: Props) {
  const errorNotice = props.error
    ? mapWorkspaceActionError(
        props.error,
        "振り返りデータの取得に失敗しました。"
      )
    : null;
  const monthLabel = props.data?.month
    ? (() => {
        const [y, m] = props.data.month.split("-");
        return `${y}年${m}月`;
      })()
    : null;

  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-950">
          Growth / Reflection
          {monthLabel ? (
            <span className="ml-2 text-xs font-normal text-slate-400">
              {monthLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          今月の活動を継続・完了・次の改善点の 3 軸で振り返ります。
        </p>
      </div>

      {props.loading ? (
        <WorkspaceLoadingCard
          title="活動データを集計しています"
          description="今月の投稿・進捗・完了イベントをまとめています。"
        />
      ) : null}

      {!props.loading && errorNotice ? (
        <WorkspaceStatusNotice
          tone={errorNotice.tone}
          title={errorNotice.title}
          description={errorNotice.description}
        />
      ) : null}

      {!props.loading && !errorNotice && props.data ? (
        <div className="space-y-5">
          {/* ongoing */}
          {props.data.ongoing.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                継続中
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {props.data.ongoing.map((item) => (
                  <OngoingCard key={item.label} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {/* completed */}
          {props.data.completed.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                今月の完了
              </div>
              <ul className="divide-y divide-slate-100">
                {props.data.completed.map((item, i) => (
                  <CompletedRow key={`${item.label}-${i}`} item={item} />
                ))}
              </ul>
            </div>
          ) : null}

          {/* improvements */}
          {props.data.improvements.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                次の改善点
              </div>
              <ul className="divide-y divide-slate-100">
                {props.data.improvements.map((item, i) => (
                  <ImprovementRow key={`${item.label}-${i}`} item={item} />
                ))}
              </ul>
            </div>
          ) : null}

          {props.data.ongoing.length === 0 &&
          props.data.completed.length === 0 &&
          props.data.improvements.length === 0 ? (
            <WorkspaceEmptyState
              title="今月はまだ活動記録がありません"
              description="投稿・ミーティング・AI提案の採用などを記録すると、ここに振り返りが表示されます。"
            />
          ) : null}
        </div>
      ) : null}

      {!props.loading && !errorNotice && !props.data ? (
        <WorkspaceEmptyState
          title="今月はまだ活動記録がありません"
          description="投稿・ミーティング・AI提案の採用などを記録すると、ここに振り返りが表示されます。"
        />
      ) : null}
    </section>
  );
}
