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

  if (
    params.avgProgressPct > 0 &&
    params.avgProgressPct < 100 &&
    !params.needsSetup
  ) {
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
    if (!unique.has(item.title)) {
      unique.set(item.title, item);
    }
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
  const currentAmount =
    progress?.confirmedAmount ?? progress?.confirmedTotal ?? null;
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
      : "未設定";

  const targetLabel =
    targetAmount !== null
      ? `${formatAmountByCurrency(targetAmount, unitCurrency)} ${unitCurrency}`
      : "目標未設定";

  const primaryProjectTitle = summary?.project.title ?? "最初のプロジェクトを準備中";

  const aiOfficeLabel = props.isNewCreator
    ? "AIに最初の一歩を相談する"
    : "AI事務所を開く";

  return (
    <section className="sheet-section overflow-hidden bg-[linear-gradient(135deg,var(--surface-subtle)_0%,var(--surface)_52%,var(--surface-subtle)_100%)]">
      <div className="space-y-5 p-5 sm:p-6">
        {/* ── ヘッダー ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-kicker">今日の仕事場</span>
            <span className="surface-chip bg-[var(--surface)] text-[var(--text-subtle)]">
              {statusLabel}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            {props.creatorName}さんの今日の仕事場
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            {structuredFocusTheme}
          </p>
          {!props.needsSetup && props.dailyBriefing?.summaryLine ? (
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
              {props.dailyBriefing.summaryLine}
            </p>
          ) : null}
        </div>

        {/* ── プロジェクト進捗 ── */}
        <div className="border-t border-[var(--line)] pt-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <div className="text-xs font-medium text-[var(--muted)]">現在の主プロジェクト</div>
              <div className="mt-0.5 text-base font-semibold text-[var(--text)]">
                {primaryProjectTitle}
              </div>
              <div className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">
                {hasPrimaryProject
                  ? goal?.achievedAt
                    ? "目標達成後の整理フェーズに入っています。"
                    : targetAmount !== null
                      ? `目標 ${targetLabel} に向けて進行中です。`
                      : "Goal を設定すると、支援者に次の一歩が伝わりやすくなります。"
                  : "Project / Goal を整えると、日々の運営拠点として機能し始めます。"}
              </div>
            </div>
          </div>

          {/* データタイル — 3列 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="data-tile px-3 py-2.5 sm:px-4 sm:py-3 border-[var(--text)] bg-[var(--text)] text-[var(--bg)]">
              <div className="text-[11px] leading-4 text-[var(--muted)]">進捗</div>
              <div className="mt-1 text-xl font-semibold sm:text-2xl">{progressPct}%</div>
            </div>
            <div className="data-tile px-3 py-2.5 sm:px-4 sm:py-3 text-[var(--text)]">
              <div className="text-[11px] leading-4 text-[var(--muted)]">支援額</div>
              <div className="mt-1 text-sm font-semibold leading-5">{supportLabel}</div>
            </div>
            <div className="data-tile px-3 py-2.5 sm:px-4 sm:py-3 text-[var(--text)]">
              <div className="text-[11px] leading-4 text-[var(--muted)]">投稿数</div>
              <div className="mt-1 text-sm font-semibold leading-5">
                {props.postCount !== null ? `${props.postCount}件` : "—"}
              </div>
              <div className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
                {props.publishedCount !== null
                  ? `公開 ${props.publishedCount}件`
                  : "公開数は取得中"}
              </div>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-subtle)]">
            <span>目標: {targetLabel}</span>
            {remainingAmount !== null && remainingAmount > 0 ? (
              <span>
                あと {formatAmountByCurrency(remainingAmount, unitCurrency)}{" "}
                {unitCurrency}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── 今日の優先項目 ── */}
        <div className="border-t border-[var(--line)] pt-4">
          <div className="section-kicker mb-3">今日の優先項目</div>
          <div className="divide-y divide-[var(--line)]">
            {structuredPriorityItems.map((item, index) => (
              <div
                key={item.title}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="surface-chip h-7 w-7 shrink-0 justify-center px-0 text-[var(--text-subtle)]">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                  <div className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="btn min-h-10 px-5"
            onClick={props.onOpenSettings}
          >
            設定・準備を開く
          </button>
          <a href={props.aiOfficeHref} className="btn-secondary min-h-10 px-5">
            {aiOfficeLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
