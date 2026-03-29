"use client";

import type { HomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import type { CreatorStageResult, CreatorStage } from "@/lib/creatorStage";

const STAGE_ORDER: CreatorStage[] = [
  "SEED",
  "EARLY",
  "EMERGING",
  "PROFESSIONALIZING",
  "ESTABLISHED",
];

type Props = Pick<
  HomeStats,
  | "jpycTotal"
  | "usdcTotal"
  | "avgProgressPct"
  | "postCount"
  | "publishedCount"
  | "loadingPosting"
> & {
  stage?: CreatorStageResult | null;
};

export function CreatorReadyWeeklySummarySection(props: Props) {
  const supportLines = [
    props.jpycTotal ? `JPYC ${props.jpycTotal}` : null,
    props.usdcTotal ? `USDC ${props.usdcTotal}` : null,
  ].filter(Boolean);

  const supportSub =
    supportLines.length > 0 ? supportLines.join(" / ") : "目標未設定";

  const postValue =
    props.loadingPosting
      ? "—"
      : props.postCount !== null
        ? String(props.postCount)
        : "—";

  const stage = props.stage;
  const currentStageIndex = stage ? STAGE_ORDER.indexOf(stage.stage) : -1;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">
        活動サマリー
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs text-[var(--text-subtle)]">支援進捗</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {props.avgProgressPct}%
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">
            {supportSub}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs text-[var(--text-subtle)]">投稿数</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {postValue}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
            {props.publishedCount !== null && !props.loadingPosting
              ? `CF内 累計 / うち公開 ${props.publishedCount.toString()}件`
              : "CF内 累計"}
          </div>
        </div>
      </div>

      {stage ? (
        <div className="mt-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3">
          <div className="mb-2 text-xs text-[var(--text-subtle)]">Creator Stage</div>
          <div className="flex flex-wrap gap-1.5">
            {STAGE_ORDER.map((s, i) => {
              const isActive = i === currentStageIndex;
              const isPast = i < currentStageIndex;
              const label = s === "PROFESSIONALIZING" ? "Professional." : s;
              return (
                <span
                  key={s}
                  className={[
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    isActive
                      ? "bg-[var(--text)] text-[var(--surface)]"
                      : isPast
                        ? "text-[var(--text-subtle)] line-through"
                        : "text-[var(--text-subtle)] opacity-40",
                  ].join(" ")}
                >
                  {label}
                </span>
              );
            })}
          </div>
          {stage.stageDescription ? (
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-subtle)]">
              {stage.stageDescription}
            </p>
          ) : null}
          {stage.nextMilestone ? (
            <p className="mt-1 text-[11px] leading-4 font-medium text-[var(--text)]">
              → {stage.nextMilestone}
            </p>
          ) : null}
          {(() => {
            const axes = [
              ["output", "発信"],
              ["audience", "支援者"],
              ["business", "実績"],
              ["continuity", "継続"],
              ["craft", "エビデンス"],
              ["trust", "信頼"],
              ["operations", "運営"],
              ["team", "チーム"],
            ] as const;
            const weakestAxis = axes.reduce(
              (min, cur) =>
                stage.maturity[cur[0]] < stage.maturity[min[0]] ? cur : min,
              axes[0]
            );
            return (
              <>
                <div className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[11px]">
                  <span className="text-[var(--text-subtle)]">次に伸ばすべき軸 </span>
                  <span className="font-semibold text-[var(--text)]">{weakestAxis[1]}</span>
                  <span className="ml-1 text-[var(--text-subtle)]">({stage.maturity[weakestAxis[0]]}pt)</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {axes.map(([axis, label]) => {
                    const isWeakest = axis === weakestAxis[0];
                    return (
                      <div key={axis} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={isWeakest ? "font-semibold text-[var(--text)]" : "text-[var(--text-subtle)]"}>
                            {label}
                          </span>
                          <span className={isWeakest ? "font-semibold text-[var(--text)]" : "font-medium text-[var(--text)]"}>
                            {stage.maturity[axis]}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                          <div
                            className={`h-full rounded-full ${isWeakest ? "bg-amber-400" : "bg-[var(--text-subtle)]"}`}
                            style={{ width: `${stage.maturity[axis]}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
