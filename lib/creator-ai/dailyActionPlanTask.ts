import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";

type DailyAction = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: "approval" | "posting" | "goal" | "engagement" | "next-step";
};

export async function buildDailyActionPlanOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const since7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    lastPost,
    pendingTaskCount,
    recentContributions,
    activeGoal,
    credibility,
    monthRevenue,
    monthExpense,
    lastMonthRevenue,
    creatorProfileSnapshot,
  ] = await Promise.all([
      prisma.post.findFirst({
        where: {
          creatorProfileId: params.creatorProfileId,
          status: "PUBLIC",
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.agentTask.count({
        where: {
          creatorProfileId: params.creatorProfileId,
          status: "WAITING_APPROVAL",
        },
      }),
      params.projectId
        ? prisma.contribution.aggregate({
            where: {
              projectId: params.projectId,
              status: "CONFIRMED",
              confirmedAt: { gte: since7Days },
            },
            _count: { _all: true },
          })
        : Promise.resolve(null),
      params.projectId
        ? prisma.goal.findFirst({
            where: { projectId: params.projectId },
            select: {
              targetAmount: true,
              achievedAt: true,
              deadline: true,
            },
          })
        : Promise.resolve(null),
      getCreatorActivityCredibility(params.creatorProfileId),
      prisma.revenueRecord.aggregate({
        where: {
          creatorProfileId: params.creatorProfileId,
          occurredAt: { gte: startOfMonth },
        },
        _sum: { amountDecimal: true },
      }),
      prisma.expense.aggregate({
        where: {
          creatorProfileId: params.creatorProfileId,
          occurredAt: { gte: startOfMonth },
        },
        _sum: { amountDecimal: true },
      }),
      prisma.revenueRecord.aggregate({
        where: {
          creatorProfileId: params.creatorProfileId,
          occurredAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amountDecimal: true },
      }),
      prisma.creatorProfile.findUnique({
        where: { id: params.creatorProfileId },
        select: { profileText: true, ecosystemRole: true },
      }),
    ]);

  const stageResult = deriveCreatorStage(credibility);

  // Cashflow signals
  const thisMonthRevenue = Number(monthRevenue._sum.amountDecimal ?? 0);
  const thisMonthExpense = Number(monthExpense._sum.amountDecimal ?? 0);
  const lastMonthRevenueAmount = Number(lastMonthRevenue._sum.amountDecimal ?? 0);
  const hasCashflowData = thisMonthRevenue > 0 || thisMonthExpense > 0;
  const netCashflow = thisMonthRevenue - thisMonthExpense;
  const revenueTrendPct =
    lastMonthRevenueAmount > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenueAmount) / lastMonthRevenueAmount) * 100)
      : null;

  // Weakest maturity axis
  const maturityEntries = Object.entries(stageResult.maturity) as [string, number][];
  const weakestAxis = maturityEntries.sort((a, b) => a[1] - b[1])[0];
  const weakestAxisLabel: Record<string, string> = {
    output: "発信量",
    audience: "支援者数",
    business: "目標達成",
    continuity: "継続性",
    craft: "実績・エビデンス",
    operations: "運営体制",
    trust: "信頼・リピート",
    team: "チーム",
  };

  const actions: DailyAction[] = [];

  // 1. 承認待ちが最優先
  if (pendingTaskCount > 0) {
    actions.push({
      id: "approve-pending",
      title: `AI事務所の承認待ちを ${pendingTaskCount.toString()}件 確認する`,
      reason:
        "承認が溜まると提案が活かせなくなります。まず Inbox を確認しましょう。",
      priority: "high",
      category: "approval",
    });
  }

  // 2. 投稿が止まっている場合
  const daysSincePost = lastPost
    ? Math.floor(
        (now.getTime() - lastPost.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  if (daysSincePost === null || daysSincePost >= 3) {
    const postPriority: DailyAction["priority"] =
      daysSincePost === null || daysSincePost >= 7 ? "high" : "medium";
    actions.push({
      id: "create-post",
      title:
        daysSincePost === null
          ? "最初の投稿を作る"
          : `${daysSincePost.toString()}日間投稿がありません — 近況を 1 件投稿する`,
      reason:
        daysSincePost === null
          ? "投稿がないと支援者が活動内容を把握しにくい状態です。"
          : "継続的な投稿は支援者の信頼につながります。短いものでも構いません。",
      priority: postPriority,
      category: "posting",
    });
  }

  // 3. 目標の期限が近い場合
  if (activeGoal && !activeGoal.achievedAt && activeGoal.deadline) {
    const daysToDeadline = Math.floor(
      (activeGoal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysToDeadline >= 0 && daysToDeadline <= 14) {
      actions.push({
        id: "goal-deadline",
        title: `目標期限まであと ${daysToDeadline.toString()}日 — 支援を促す投稿を作る`,
        reason:
          "期限が近いタイミングは支援を集めやすい機会です。告知文の下書きを AI 事務所に作ってもらいましょう。",
        priority: "high",
        category: "goal",
      });
    }
  }

  // 4. 直近の支援者へのお礼
  const recentCount = recentContributions?._count._all ?? 0;
  if (recentCount > 0) {
    actions.push({
      id: "thank-supporters",
      title: `直近 7 日の支援者 ${recentCount.toString()}名 にお礼メッセージを作る`,
      reason:
        "新しい支援者へのお礼はエンゲージメント継続につながります。Fan Relation Agent に下書きを頼みましょう。",
      priority: "medium",
      category: "engagement",
    });
  }

  // 5. 収支が赤字で収入記録がある場合
  if (hasCashflowData && netCashflow < 0 && thisMonthExpense > 0) {
    actions.push({
      id: "cashflow-alert",
      title: `今月の収支がマイナス — 収入源を確認・記録する`,
      reason: `今月の支出が収入を上回っています。収入記録を追加するか、次の収益機会を AI 事務所に相談しましょう。`,
      priority: "medium",
      category: "next-step",
    });
  }

  // 6. プロフィール未完成チェック
  const missingProfileFields: string[] = [];
  if (!creatorProfileSnapshot?.profileText || creatorProfileSnapshot.profileText.trim().length < 20) {
    missingProfileFields.push("紹介文");
  }
  if (!creatorProfileSnapshot?.ecosystemRole) {
    missingProfileFields.push("エコシステムロール");
  }
  if (missingProfileFields.length > 0 && actions.length < 3) {
    actions.push({
      id: "profile-completeness",
      title: `プロフィールを充実させる（${missingProfileFields.join("・")}が未設定）`,
      reason:
        "プロフィールが充実すると発見されやすくなり、支援者やコラボレーターからの信頼が高まります。",
      priority: "low",
      category: "next-step",
    });
  }

  // 7. デフォルト提案
  if (actions.length < 2) {
    actions.push({
      id: "propose-next",
      title: "次の施策案を AI 事務所に相談する",
      reason:
        "Manager Agent または Promotion Agent に次の一手を整理してもらいましょう。",
      priority: "low",
      category: "next-step",
    });
  }

  const highCount = actions.filter((a) => a.priority === "high").length;
  const fallbackSummary =
    highCount > 0
      ? `今日の優先タスクは ${highCount.toString()}件です。承認待ちと重要度の高いものから始めましょう。`
      : `今日のやることを ${actions.length.toString()}件 整理しました。状況に合わせて取り組んでください。`;

  // AI enhancement: improve descriptions of precomputed actions
  const cashflowLine = hasCashflowData
    ? `今月の収入: ${thisMonthRevenue.toLocaleString()} / 支出: ${thisMonthExpense.toLocaleString()} / 収支: ${netCashflow >= 0 ? "+" : ""}${netCashflow.toLocaleString()}${revenueTrendPct !== null ? ` / 先月比: ${revenueTrendPct >= 0 ? "+" : ""}${revenueTrendPct.toString()}%` : ""}`
    : "収支データなし";

  // Deduplicate: max 2 per category, preserve priority order
  function deduplicateActions(raw: DailyAction[]): DailyAction[] {
    const countPerCategory: Record<string, number> = {};
    return raw.filter((a) => {
      const count = countPerCategory[a.category] ?? 0;
      if (count >= 2) return false;
      countPerCategory[a.category] = count + 1;
      return true;
    });
  }

  const deduplicatedActions = deduplicateActions(actions);

  // Build precomputed action list for AI context
  const precomputedLines = deduplicatedActions
    .map((a) => `[${a.priority}] ${a.title} — ${a.reason}`)
    .join("\n");

  const aiResult = await generateJson<{ summary: string; actions: DailyAction[] }>(
    `クリエイターの今日の優先アクションを整理してください。以下のアクション候補をもとに、より具体的な言葉で改善してください（削除や並び替えは不要です）。

## アクション候補
${precomputedLines}

## コンテキスト
Creator Stage: ${stageResult.stage} (${stageResult.stageLabel})
次のマイルストーン: ${stageResult.nextMilestone ?? "なし"}
最弱の成熟軸: ${weakestAxis ? `${weakestAxisLabel[weakestAxis[0]] ?? weakestAxis[0]}（${weakestAxis[1].toString()}点）` : "不明"}
今月の収支: ${cashflowLine}

以下のJSON形式のみで返してください（actions の件数は候補と同じにしてください）:
{"summary":"今日の状況を一言で（数字を含めて具体的に）","actions":[{"id":"action-1","title":"具体的なアクション","reason":"理由（1文）","priority":"high","category":"approval"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターの日常運営をサポートするAIアシスタントです。具体的で実行可能な日本語で答えてください。category は approval/posting/goal/engagement/next-step のいずれかのみ使用。",
      maxTokens: 600,
      temperature: 0.4,
    }
  );

  // Always keep critical rule-based actions (approval) even if AI drops them
  const criticalActions = deduplicatedActions.filter((a) => a.category === "approval");
  let mergedActions: DailyAction[];
  if (aiResult?.actions?.length) {
    const aiActions = aiResult.actions.slice(0, 5);
    const hasApprovalAction = aiActions.some((a) => a.category === "approval");
    mergedActions = hasApprovalAction
      ? aiActions
      : [...criticalActions, ...aiActions.filter((a) => a.category !== "approval")].slice(0, 5);
  } else {
    mergedActions = deduplicatedActions;
  }

  const finalSummary = aiResult?.summary ?? fallbackSummary;
  const finalActions = mergedActions;

  return {
    summary: finalSummary,
    actions: finalActions,
    generatedAt: now.toISOString(),
    context: {
      daysSinceLastPost: daysSincePost,
      pendingApprovals: pendingTaskCount,
      recentContributionCount: recentCount,
      stage: stageResult.stage,
      stageLabel: stageResult.stageLabel,
      weakestMaturityAxis: weakestAxis?.[0] ?? null,
      weakestMaturityScore: weakestAxis?.[1] ?? null,
      thisMonthRevenue: hasCashflowData ? thisMonthRevenue : null,
      thisMonthExpense: hasCashflowData ? thisMonthExpense : null,
      netCashflow: hasCashflowData ? netCashflow : null,
      revenueTrendPct,
      missingProfileFields: missingProfileFields.length > 0 ? missingProfileFields : null,
    },
    basedOn: params.input,
  };
}
