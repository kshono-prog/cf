import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

type RestartStep = {
  step: number;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
};

export async function buildActivityRestartProposalOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const since90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [lastPost, topPosts, recentContributions, goalInfo] =
    await Promise.all([
      prisma.post.findFirst({
        where: {
          creatorProfileId: params.creatorProfileId,
          status: "PUBLIC",
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, body: true },
      }),
      prisma.post.findMany({
        where: {
          creatorProfileId: params.creatorProfileId,
          status: "PUBLIC",
          createdAt: { gte: since90Days },
        },
        orderBy: [{ likeCount: "desc" }, { replyCount: "desc" }],
        take: 3,
        select: {
          body: true,
          likeCount: true,
          replyCount: true,
          createdAt: true,
        },
      }),
      params.projectId
        ? prisma.contribution.aggregate({
            where: {
              projectId: params.projectId,
              status: "CONFIRMED",
              confirmedAt: { gte: since30Days },
            },
            _count: { _all: true },
            _sum: { amountDecimal: true },
          })
        : Promise.resolve(null),
      params.projectId
        ? prisma.goal.findFirst({
            where: { projectId: params.projectId },
            select: { targetAmount: true, achievedAt: true },
          })
        : Promise.resolve(null),
    ]);

  const daysSincePost = lastPost
    ? Math.floor(
        (now.getTime() - lastPost.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // 過去の成功パターンを抽出
  const successPatterns: string[] = [];
  for (const post of topPosts) {
    const engagement = post.likeCount + post.replyCount;
    if (engagement > 0) {
      const excerpt =
        post.body.slice(0, 60) + (post.body.length > 60 ? "…" : "");
      successPatterns.push(
        `「${excerpt}」— いいね ${post.likeCount.toString()} / 返信 ${post.replyCount.toString()}`
      );
    }
  }

  // 再起動ステップを構築
  const restartSteps: RestartStep[] = [];

  restartSteps.push({
    step: 1,
    title: "短い近況報告を 1 件投稿する",
    description:
      "内容は短くて良いです。「最近こんなことをしていました」程度で構いません。続けることよりも再開することに意味があります。",
    effort: "low",
  });

  if (successPatterns.length > 0) {
    restartSteps.push({
      step: 2,
      title: "過去に反応が良かったテーマで投稿する",
      description:
        "過去の成功パターンを参考に、同じテーマで新しい投稿を作ってみましょう。慣れた切り口から始めるのが再起動に有効です。",
      effort: "low",
    });
  }

  restartSteps.push({
    step: restartSteps.length + 1,
    title: "小さな目標を 1 つ設定する",
    description:
      "「今月 3 件投稿する」など、達成しやすい目標を設定して再スタートの勢いをつけましょう。",
    effort: "medium",
  });

  if (!goalInfo?.achievedAt) {
    restartSteps.push({
      step: restartSteps.length + 1,
      title: "支援目標の現状を確認して更新する",
      description:
        "活動が止まっていた期間の進捗を整理して、次の目標期限を現実的に調整しましょう。Manager Agent に現状分析を依頼するのもおすすめです。",
      effort: "medium",
    });
  }

  const inactivityNote =
    daysSincePost === null
      ? "まだ投稿がない状態です。"
      : `最後の投稿から ${daysSincePost.toString()}日 が経っています。`;

  const fallbackSummary =
    daysSincePost === null || daysSincePost >= 14
      ? `${inactivityNote}再始動のための小さなステップを ${restartSteps.length.toString()}件 提案します。`
      : `${inactivityNote}活動を再び軌道に乗せるためのヒントを整理しました。`;

  // AI enhancement: generate more personalized restart guidance
  const aiResult = await generateJson<{
    summary: string;
    restartSteps: RestartStep[];
  }>(
    `クリエイターの活動再起動プランを作成してください。
${inactivityNote}
過去の成功パターン: ${successPatterns.slice(0, 2).join(" / ") || "なし"}
直近30日の支援: ${recentContributions ? `${recentContributions._count._all.toString()}件` : "なし"}

心理的ハードルが低い順に3ステップの再起動プランを提案してください。effort は "low" / "medium" / "high" のいずれか。
以下のJSON形式のみで返してください:
{"summary":"現状と再起動への一言メッセージ","restartSteps":[{"step":1,"title":"最初のステップ","description":"具体的な説明（2文以内）","effort":"low"},{"step":2,"title":"...","description":"...","effort":"medium"},{"step":3,"title":"...","description":"...","effort":"medium"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターの活動継続をサポートするAIコーチです。温かく実践的な日本語でアドバイスしてください。",
      maxTokens: 512,
      temperature: 0.7,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    inactivityContext: {
      daysSinceLastPost: daysSincePost,
      inactivityNote,
    },
    successPatterns,
    restartSteps: aiResult?.restartSteps?.length ? aiResult.restartSteps : restartSteps,
    supportContext: recentContributions
      ? {
          recentContributionCount: recentContributions._count._all,
          recentTotal: recentContributions._sum.amountDecimal
            ? Number(recentContributions._sum.amountDecimal)
            : 0,
        }
      : null,
    basedOn: params.input,
  };
}
