"use client";

import {
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import type { SupporterOverviewData } from "@/lib/operations/supporterOverviewTypes";

function abbreviateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type Props = {
  loading: boolean;
  error: string | null;
  data: SupporterOverviewData | null;
  aiOfficeCreateFanRelationHref: string;
};

function StatCard(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3">
      <div className="text-xs text-[var(--text-subtle)]">{props.label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
        {props.value}
      </div>
      {props.sub ? (
        <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{props.sub}</div>
      ) : null}
    </div>
  );
}

export function CreatorReadySupporterOverviewSection(props: Props) {
  const errorNotice = props.error
    ? mapWorkspaceActionError(
        props.error,
        "サポーター概要の取得に失敗しました。"
      )
    : null;

  if (!props.loading && !props.data && !errorNotice) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--text)]">ファンとの関係</div>
        <a
          href={props.aiOfficeCreateFanRelationHref}
          className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-[11px] font-medium text-[var(--text-subtle)] transition hover:border-[var(--text-subtle)]"
        >
          お礼メッセージを作る →
        </a>
      </div>

      {props.loading ? (
        <div className="py-4 text-center text-xs text-[var(--text-subtle)]">読み込み中…</div>
      ) : errorNotice ? (
        <WorkspaceStatusNotice
          tone={errorNotice.tone}
          title={errorNotice.title}
          description={errorNotice.description}
        />
      ) : props.data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="累計サポーター"
              value={String(props.data.totalSupporterCount)}
              sub="人"
            />
            <StatCard
              label="今月の新規"
              value={String(props.data.newThisMonthCount)}
              sub="人"
            />
            <StatCard
              label="直近 30 日"
              value={String(props.data.recentSupporterCount)}
              sub="人"
            />
          </div>

          {props.data.topSupporters.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-subtle)]">
                支援回数が多いサポーター
              </div>
              <div className="space-y-1.5">
                {props.data.topSupporters.map((item, i) => (
                  <div
                    key={item.fromAddress}
                    className="flex items-center justify-between rounded-xl bg-[var(--surface-subtle)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-bold text-[var(--surface)]">
                        {(i + 1).toString()}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text)]">
                        {abbreviateAddress(item.fromAddress)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                      <span>{item.currencies.join(" / ")}</span>
                      <span className="font-semibold text-[var(--text)]">
                        {item.contributionCount.toString()}回
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
