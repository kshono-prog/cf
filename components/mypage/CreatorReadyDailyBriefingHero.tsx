"use client";

import { formatAmountByCurrency } from "@/lib/mypage/accountPageTypes";
import {
  hasProjectSummary,
  type MyPageProjectDashboard,
} from "@/lib/mypage/dashboardTypes";
import type { CreatorDailyBriefingData } from "@/lib/operations/dailyBriefingTypes";

type Props = {
  creatorName: string;
  aiOfficeHref: string;
  primaryDashboard: MyPageProjectDashboard | null;
  avgProgressPct: number;
  postCount: number | null;
  publishedCount: number | null;
  needsSetup: boolean;
  profileMissing: boolean;
  goalMissing: boolean;
  settlementAttentionNeeded: boolean;
  isNewCreator: boolean;
  dailyBriefing: CreatorDailyBriefingData | null;
  onOpenSettings: () => void;
};

type PriorityItem = {
  title: string;
  body: string;
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildFocusTheme(params: {
  needsSetup: boolean;
  settlementAttentionNeeded: boolean;
  isNewCreator: boolean;
  avgProgressPct: number;
  hasPrimaryProject: boolean;
}): string {
  if (params.settlementAttentionNeeded) {
    return "達成後の整理と次の一手を整える週です。";
  }
  if (params.needsSetup) {
    return "プロフィールと支援導線の土台を整える週です。";
  }
  if (params.isNewCreator) {
    return "最初の発信と目標設定を形にする週です。";
  }
  if (!params.hasPrimaryProject) {
    return "最初のプロジェクトを立ち上げる準備を進める週です。";
  }
  if (params.avgProgressPct >= 100) {
    return "達成後の報告と次の挑戦の準備を進める週です。";
  }
  if (params.avgProgressPct >= 70) {
    return "達成に向けて最後の後押しをつくる週です。";
  }
  if (params.avgProgressPct >= 30) {
    return "進捗共有を重ねて支援の流れを太くする週です。";
  }
  return "支援の理由と近況共有を整えて最初の反応を集める週です。";
}

function buildPriorityItems(params: {
  needsSetup: boolean;
  profileMissing: boolean;
  goalMissing: boolean;
  settlementAttentionNeeded: boolean;
  isNewCreator: boolean;
  hasPrimaryProject: boolean;
  postCount: number | null;
  avgProgressPct: number;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (params.profileMissing) {
    items.push({
      title: "プロフィールの土台を整える",
      body: "名前・紹介文を入れると、公開ページが支援者に伝わりやすくなります。",
    });
  }
  if (params.goalMissing) {
    items.push({
      title: "目標金額を設定する",
      body: "何を目指しているかが見えると、支援の理由が分かりやすくなります。",
    });
  }
  if (params.settlementAttentionNeeded) {
    items.push({
      title: "精算対象のプロジェクトを確認する",
      body: "達成後の配分・ブリッジ状況を見直して、次の段取りを揃えましょう。",
    });
  }
  if (!params.hasPrimaryProject) {
    items.push({
      title: "最初のプロジェクトをつくる",
      body: "受け皿となる Project を用意して、Goal と公開導線につなげます。",
    });
  }
  if ((params.postCount ?? 0) === 0) {
    items.push({
      title: "近況投稿を1本出す",
      body: "最初の投稿があるだけで、活動が止まっていないことが伝わります。",
    });
  }
  if (!params.needsSetup && !params.settlementAttentionNeeded) {
    items.push({
      title: "AI事務所で今日の計画を確認する",
      body: "提案や下書きを見ながら、今日進めることを 1 つ決めましょう。",
    });
  }
  if (params.avgProgressPct > 0 && params.avgProgressPct < 100 && !params.needsSetup) {
    items.push({
      title: "支援の使い道を短く言葉にする",
      body: "進捗と一緒に使い道を伝えると、次の支援につながりやすくなります。",
    });
  }
  if (params.isNewCreator) {
    items.push({
      title: "AIに最初の一歩を相談する",
      body: "プロフィール改善や最初の行動案づくりを AI Office に任せられます。",
    });
  }

  const unique = new Map<string, PriorityItem>();
  for (const item of items) {
    if (!unique.has(item.title)) unique.set(item.title, item);
  }
  return Array.from(unique.values()).slice(0, 3);
}

export function CreatorReadyDailyBriefingHero(props: Props) {
  const hasPrimaryProject = hasProjectSummary(props.primaryDashboard);
  const primaryDashboard = hasPrimaryProject ? props.primaryDashboard : null;
  const summary = primaryDashboard?.summary ?? null;
  const progress = summary?.progress ?? null;
  const goal = summary?.goal ?? null;
  const progressPct = clampProgress(progress?.progressPct ?? props.avgProgressPct);
  const currentAmount = progress?.confirmedAmount ?? progress?.confirmedTotal ?? null;
  const unitCurrency =
    progress?.currency ?? goal?.unitCurrency ?? summary?.project.currency ?? "JPYC";
  const targetAmount = goal?.targetAmount ?? progress?.targetAmount ?? null;
  const remainingAmount =
    targetAmount !== null && currentAmount !== null
      ? Math.max(targetAmount - currentAmount, 0)
      : null;

  const focusTheme = buildFocusTheme({
    needsSetup: props.needsSetup,
    settlementAttentionNeeded: props.settlementAttentionNeeded,
    isNewCreator: props.isNewCreator,
    avgProgressPct: props.avgProgressPct,
    hasPrimaryProject,
  });
  const structuredFocusTheme =
    !props.needsSetup && props.dailyBriefing?.focusTheme
      ? props.dailyBriefing.focusTheme
      : focusTheme;

  const priorityItems = buildPriorityItems({
    needsSetup: props.needsSetup,
    profileMissing: props.profileMissing,
    goalMissing: props.goalMissing,
    settlementAttentionNeeded: props.settlementAttentionNeeded,
    isNewCreator: props.isNewCreator,
    hasPrimaryProject,
    postCount: props.postCount,
    avgProgressPct: props.avgProgressPct,
  });
  const structuredPriorityItems =
    !props.needsSetup && props.dailyBriefing
      ? props.dailyBriefing.attentionItems.map((item) => ({
          title: item.title,
          body: item.body,
        }))
      : priorityItems;

  const statusLabel = props.settlementAttentionNeeded
    ? "精算確認が必要"
    : props.needsSetup
      ? "準備中"
      : goal?.achievedAt
        ? "達成後の整理"
        : "運営中";

  const supportLabel =
    currentAmount !== null
      ? `${formatAmountByCurrency(currentAmount, unitCurrency)} ${unitCurrency}`
      : null;

  const targetLabel =
    targetAmount !== null
      ? `${formatAmountByCurrency(targetAmount, unitCurrency)} ${unitCurrency}`
      : null;

  const primaryProjectTitle = summary?.project.title ?? null;

  const aiOfficeLabel = props.isNewCreator
    ? "AIに最初の一歩を相談する"
    : "AI事務所を開く";

  return (
    <section className="overflow-hidden rounded-xl">
      {/* ── ブルーグラデーション ヒーロー ── */}
      <div
        className="relative p-5 sm:p-6"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)",
        }}
      >
        {/* 装飾円 */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10"
          style={{ background: "#fff" }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-6 h-24 w-24 rounded-full opacity-[0.06]"
          style={{ background: "#fff" }}
        />

        <div className="relative">
          {/* キッカー + ステータス */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              デイリーダイジェスト
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              {statusLabel}
            </span>
          </div>

          {/* グリーティング */}
          <h2
            className="text-xl font-extrabold tracking-tight sm:text-2xl"
            style={{ color: "#fff" }}
          >
            {props.creatorName}さん、お疲れ様です
          </h2>
          <p
            className="mt-1.5 text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            {structuredFocusTheme}
          </p>
          {!props.needsSetup && props.dailyBriefing?.summaryLine ? (
            <p
              className="mt-1 text-xs leading-5"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              {props.dailyBriefing.summaryLine}
            </p>
          ) : null}

          {/* 統計タイル */}
          <div
            className="mt-5 flex gap-0 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
          >
            <div className="flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                進捗
              </p>
              <p
                className="mt-1 text-2xl font-extrabold tracking-tight"
                style={{ color: "#fff" }}
              >
                {progressPct}%
              </p>
              {targetLabel ? (
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  目標 {targetLabel}
                </p>
              ) : null}
            </div>

            <div
              className="mx-4 w-px"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />

            <div className="flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                投稿数
              </p>
              <p
                className="mt-1 text-2xl font-extrabold tracking-tight"
                style={{ color: "#fff" }}
              >
                {props.postCount !== null ? props.postCount : "—"}
              </p>
              {props.publishedCount !== null ? (
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  公開 {props.publishedCount}件
                </p>
              ) : null}
            </div>

            {supportLabel ? (
              <>
                <div
                  className="mx-4 w-px"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
                <div className="flex-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    支援額
                  </p>
                  <p
                    className="mt-1 text-lg font-bold leading-tight"
                    style={{ color: "#fff" }}
                  >
                    {supportLabel}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── プロジェクト進捗バー ── */}
      {(primaryProjectTitle || targetLabel) ? (
        <div className="border-x border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-[var(--text)] truncate">
              {primaryProjectTitle ?? "プロジェクト"}
            </p>
            <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent)]">
              {progressPct}% 達成
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, var(--accent), #60a5fa)",
              }}
            />
          </div>
          {(targetLabel || remainingAmount !== null) ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-subtle)]">
              {targetLabel ? <span>目標: {targetLabel}</span> : null}
              {remainingAmount !== null && remainingAmount > 0 ? (
                <span>あと {formatAmountByCurrency(remainingAmount, unitCurrency)} {unitCurrency}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── 今日の優先項目 ── */}
      {structuredPriorityItems.length > 0 ? (
        <div className="border-x border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4 rounded-b-2xl">
          <p className="section-kicker mb-3">今日の優先項目</p>
          <div className="space-y-0 divide-y divide-[var(--line)]">
            {structuredPriorityItems.map((item, index) => (
              <div
                key={item.title}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[11px] font-bold text-[var(--accent)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — 最大2つ */}
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-[var(--line)]">
            <a href={props.aiOfficeHref} className="btn min-h-10 px-5">
              {aiOfficeLabel}
            </a>
            <button
              type="button"
              className="btn-secondary min-h-10 px-5"
              onClick={props.onOpenSettings}
            >
              設定を開く
            </button>
          </div>
        </div>
      ) : (
        /* 優先項目がない場合の CTA */
        <div className="border-x border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4 rounded-b-2xl">
          <div className="flex flex-wrap gap-2">
            <a href={props.aiOfficeHref} className="btn min-h-10 px-5">
              {aiOfficeLabel}
            </a>
            <button
              type="button"
              className="btn-secondary min-h-10 px-5"
              onClick={props.onOpenSettings}
            >
              設定を開く
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
