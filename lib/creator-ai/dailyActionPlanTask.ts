import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

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

  const [lastPost, pendingTaskCount, recentContributions, activeGoal] =
    await Promise.all([
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
    ]);

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

  // 5. デフォルト提案
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

  // AI enhancement: generate better action descriptions
  const aiResult = await generateJson<{ summary: string; actions: DailyAction[] }>(
    `クリエイターの今日の優先アクションを整理してください。
承認待ちタスク: ${pendingTaskCount.toString()}件
最終投稿からの日数: ${daysSincePost === null ? "まだ投稿なし" : `${daysSincePost.toString()}日`}
直近7日の新規支援者: ${recentCount.toString()}名
目標期限まで: ${activeGoal?.deadline ? `${Math.floor((activeGoal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)).toString()}日` : "未設定"}
目標達成済み: ${activeGoal?.achievedAt ? "はい" : "いいえ"}

今日優先すべきアクションを3件以内で提案してください。category は "approval" / "posting" / "goal" / "engagement" / "next-step" のいずれかを使用。
以下のJSON形式のみで返してください:
{"summary":"今日の状況を一言で","actions":[{"id":"action-1","title":"具体的なアクション","reason":"理由（1文）","priority":"high","category":"approval"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターの日常運営をサポートするAIアシスタントです。具体的で実行可能な日本語で答えてください。",
      maxTokens: 512,
      temperature: 0.5,
    }
  );

  const finalSummary = aiResult?.summary ?? fallbackSummary;
  const finalActions =
    aiResult?.actions?.length ? aiResult.actions.slice(0, 5) : actions;

  return {
    summary: finalSummary,
    actions: finalActions,
    generatedAt: now.toISOString(),
    context: {
      daysSinceLastPost: daysSincePost,
      pendingApprovals: pendingTaskCount,
      recentContributionCount: recentCount,
    },
    basedOn: params.input,
  };
}
