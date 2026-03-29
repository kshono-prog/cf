"use client";

import type { GrowthOverviewData } from "@/lib/growth/overview";

type Props = {
  loading: boolean;
  error: string | null;
  data: GrowthOverviewData | null;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "未記録";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未記録";
  }

  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard(props: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  const toneClassName =
    props.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--text)]";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClassName}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        {props.label}
      </div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
    </div>
  );
}

export function GrowthOverviewCard(props: Props) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Growth overview
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            公開準備から初回支援までの動きを記録しています。どこまで進んだかと、最近の反応をここで確認できます。
          </p>
        </div>
        {props.data ? (
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            マイルストーン {props.data.milestoneCompletionCount} /{" "}
            {props.data.milestoneTotalCount}
          </div>
        ) : null}
      </div>

      {props.loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--text-subtle)]">
          成長データを読み込んでいます...
        </div>
      ) : props.error ? (
        <div className="alert-warn mt-4">
          成長データの取得に失敗しました。少し時間をおいて再読み込みしてください。
        </div>
      ) : props.data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="公開ページ確認"
              value={props.data.metrics.ownerPublicPageViewCount.toString()}
            />
            <StatCard
              label="拡散文面生成"
              value={props.data.metrics.shareDraftGeneratedCount.toString()}
            />
            <StatCard
              label="文面コピー"
              value={props.data.metrics.shareCopiedCount.toString()}
            />
            <StatCard
              label="投稿記録"
              value={props.data.metrics.sharePostLoggedCount.toString()}
            />
            <StatCard
              label="支援確定"
              value={props.data.metrics.confirmedContributionCount.toString()}
              tone={
                props.data.metrics.confirmedContributionCount > 0
                  ? "success"
                  : "default"
              }
            />
          </div>

          <div
            className={`mt-4 rounded-2xl border px-4 py-4 ${
              props.data.firstTipReceivedAt
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="text-sm font-semibold text-[var(--text)]">
              {props.data.firstTipReceivedAt
                ? "初回支援を受け取りました"
                : "初回支援はまだ未達です"}
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              {props.data.firstTipReceivedAt
                ? `${formatDateTime(props.data.firstTipReceivedAt)} に初回支援を確認しました。`
                : "公開ページ確認と拡散文面生成までは進んでいるので、次はシェア回数を増やして最初の支援につなげる段階です。"}
            </div>
            {props.data.latestConfirmedContributionAt ? (
              <div className="mt-2 text-xs text-[var(--text-subtle)]">
                直近の支援確定:{" "}
                {formatDateTime(props.data.latestConfirmedContributionAt)}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                ファネルの現在地
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {props.data.milestones.map((milestone) => (
                  <div
                    key={milestone.event}
                    className={`rounded-xl border px-3 py-3 ${
                      milestone.completed
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-[var(--line)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--text)]">
                        {milestone.label}
                      </div>
                      <span className="text-xs font-medium text-[var(--text-subtle)]">
                        {milestone.count} 回
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-subtle)]">
                      {milestone.completed
                        ? `最終記録 ${formatDateTime(milestone.lastAt)}`
                        : "まだ記録がありません"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                最近の動き
              </div>
              {props.data.recentEvents.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {props.data.recentEvents.map((event, index) => (
                    <div
                      key={`${event.event}-${event.createdAt}-${index.toString()}`}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
                    >
                      <div className="text-sm font-medium text-[var(--text)]">
                        {event.label}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-subtle)]">
                        {formatDateTime(event.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-3 py-4 text-sm text-[var(--text-subtle)]">
                  まだ growth event はありません。
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--text-subtle)]">
          成長データはまだありません。
        </div>
      )}
    </section>
  );
}
