import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfPrevMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function toNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

function formatPeriod(d: Date): string {
  const y = d.getFullYear().toString();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

type SourceGroup = { source: string; amount: number };
type CategoryGroup = { category: string; amount: number };

export async function buildMonthlyCashflowReportOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const period = formatPeriod(now);

  const [
    thisMonthRevenues,
    thisMonthExpenses,
    prevMonthRevenueAgg,
    prevMonthExpenseAgg,
  ] = await Promise.all([
    prisma.revenueRecord.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        occurredAt: { gte: thisMonthStart },
      },
      select: { source: true, amountDecimal: true, currency: true },
    }),
    prisma.expense.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        occurredAt: { gte: thisMonthStart },
      },
      select: { category: true, amountDecimal: true, currency: true },
    }),
    prisma.revenueRecord.aggregate({
      where: {
        creatorProfileId: params.creatorProfileId,
        occurredAt: { gte: prevMonthStart, lt: thisMonthStart },
      },
      _sum: { amountDecimal: true },
    }),
    prisma.expense.aggregate({
      where: {
        creatorProfileId: params.creatorProfileId,
        occurredAt: { gte: prevMonthStart, lt: thisMonthStart },
      },
      _sum: { amountDecimal: true },
    }),
  ]);

  // Aggregate this month revenue by source
  const revenueSourceMap = new Map<string, number>();
  for (const r of thisMonthRevenues) {
    const key = r.source ?? "OTHER";
    revenueSourceMap.set(key, (revenueSourceMap.get(key) ?? 0) + toNumber(r.amountDecimal));
  }
  const revenueBySource: SourceGroup[] = Array.from(revenueSourceMap.entries())
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Aggregate this month expense by category
  const expenseCategoryMap = new Map<string, number>();
  for (const e of thisMonthExpenses) {
    const key = e.category ?? "OTHER";
    expenseCategoryMap.set(key, (expenseCategoryMap.get(key) ?? 0) + toNumber(e.amountDecimal));
  }
  const expenseByCategory: CategoryGroup[] = Array.from(expenseCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalRevenue = revenueBySource.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenseByCategory.reduce((s, e) => s + e.amount, 0);
  const netCashflow = totalRevenue - totalExpense;

  const prevMonthRevenue = toNumber(prevMonthRevenueAgg._sum.amountDecimal);
  const prevMonthExpense = toNumber(prevMonthExpenseAgg._sum.amountDecimal);

  const hasPrevData = prevMonthRevenue > 0 || prevMonthExpense > 0;
  const revenueDiff =
    hasPrevData && prevMonthRevenue > 0
      ? Math.round(((totalRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : null;
  const expenseDiff =
    hasPrevData && prevMonthExpense > 0
      ? Math.round(((totalExpense - prevMonthExpense) / prevMonthExpense) * 100)
      : null;

  // Fallback advice
  const fallbackAdvice =
    netCashflow >= 0
      ? `今月は黒字（+${netCashflow.toLocaleString()}）です。収支バランスを維持しながら活動を続けましょう。`
      : `今月は赤字（${netCashflow.toLocaleString()}）です。費用の内訳を見直し、収入源の多様化を検討しましょう。`;

  const fallbackSummary =
    thisMonthRevenues.length === 0 && thisMonthExpenses.length === 0
      ? `${period} の収支データはまだ記録されていません。収入・支出を記録すると月次レポートを生成できます。`
      : `${period} の収入合計 ${totalRevenue.toLocaleString()}円、支出合計 ${totalExpense.toLocaleString()}円、収支 ${netCashflow >= 0 ? "+" : ""}${netCashflow.toLocaleString()}円です。`;

  // Revenue source labels (Japanese)
  const SOURCE_LABELS: Record<string, string> = {
    LIVE: "ライブ",
    GOODS: "グッズ",
    DIGITAL: "デジタルコンテンツ",
    SUBSCRIPTION: "サブスク",
    CROWDFUNDING: "クラウドファンディング",
    SPONSORSHIP: "スポンサー",
    GRANT: "助成金",
    OTHER: "その他",
  };
  const CATEGORY_LABELS: Record<string, string> = {
    VENUE: "会場費",
    EQUIPMENT: "機材",
    MARKETING: "プロモーション",
    TRAVEL: "交通費",
    PERSONNEL: "人件費",
    PRODUCTION: "制作費",
    SUBSCRIPTION: "サブスク",
    OTHER: "その他",
  };

  const revenueLines =
    revenueBySource.length > 0
      ? revenueBySource
          .map((r) => `- ${SOURCE_LABELS[r.source] ?? r.source}: ${r.amount.toLocaleString()}円`)
          .join("\n")
      : "（記録なし）";
  const expenseLines =
    expenseByCategory.length > 0
      ? expenseByCategory
          .map((e) => `- ${CATEGORY_LABELS[e.category] ?? e.category}: ${e.amount.toLocaleString()}円`)
          .join("\n")
      : "（記録なし）";

  const comparisonLine = hasPrevData
    ? `前月比: 収入 ${revenueDiff != null ? (revenueDiff >= 0 ? `+${revenueDiff.toString()}` : revenueDiff.toString()) : "N/A"}% / 支出 ${expenseDiff != null ? (expenseDiff >= 0 ? `+${expenseDiff.toString()}` : expenseDiff.toString()) : "N/A"}%`
    : "前月データなし";

  const aiResult = await generateJson<{
    summary: string;
    advice: string;
  }>(
    `クリエイターの ${period} 月次収支レポートを生成してください。
収入合計: ${totalRevenue.toLocaleString()}円
支出合計: ${totalExpense.toLocaleString()}円
収支: ${netCashflow >= 0 ? "+" : ""}${netCashflow.toLocaleString()}円
${comparisonLine}

収入内訳:
${revenueLines}

支出内訳:
${expenseLines}

この月の収支状況を1〜2文で要約し、次のアクションへの具体的なアドバイスを1〜2文で提示してください。
以下のJSON形式のみで返してください:
{"summary":"収支状況の要約（1〜2文）","advice":"次のアクションへのアドバイス（1〜2文）"}`,
    {
      systemPrompt:
        "あなたはクリエイターの財務アドバイザーです。実態に即した、実行可能な日本語のアドバイスを返してください。",
      maxTokens: 256,
      temperature: 0.6,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    advice: aiResult?.advice ?? fallbackAdvice,
    period,
    totalRevenue,
    totalExpense,
    netCashflow,
    revenueBySource: revenueBySource.map((r) => ({
      ...r,
      label: SOURCE_LABELS[r.source] ?? r.source,
    })),
    expenseByCategory: expenseByCategory.map((e) => ({
      ...e,
      label: CATEGORY_LABELS[e.category] ?? e.category,
    })),
    prevMonthRevenue: hasPrevData ? prevMonthRevenue : null,
    prevMonthExpense: hasPrevData ? prevMonthExpense : null,
    revenueDiff,
    expenseDiff,
    revenueRecordCount: thisMonthRevenues.length,
    expenseCount: thisMonthExpenses.length,
    basedOn: params.input,
  };
}
