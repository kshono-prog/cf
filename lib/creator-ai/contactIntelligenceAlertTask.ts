import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

type ContactRiskItem = {
  contactId: string;
  organizationName: string;
  riskLevel: "high" | "medium" | "low";
  riskType: "stale" | "overdue" | "no_next_action" | "cold_temperature" | "new_no_action";
  staleDays: number | null;
  nextActionDueAt: string | null;
  lastContactAt: string | null;
  status: string;
  temperature: string;
  insight: string;
  recommendation: string;
};

export async function buildContactIntelligenceAlertOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const overdueCutoff = now;

  // Fetch active external contacts for this creator
  const contacts = await prisma.externalContact.findMany({
    where: {
      creatorProfileId: params.creatorProfileId,
      status: {
        notIn: ["LOST", "WON"],
      },
    },
    select: {
      id: true,
      organizationName: true,
      status: true,
      temperature: true,
      nextAction: true,
      nextActionDueAt: true,
      lastContactAt: true,
    },
    orderBy: { lastContactAt: "asc" },
    take: 50,
  });

  if (contacts.length === 0) {
    return {
      summary: "対外接点がまだ登録されていません。Contact Pipeline に接点を追加すると分析が行えます。",
      riskContacts: [],
      healthSummary: {
        totalContacts: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        staleCount: 0,
        overdueCount: 0,
        noNextActionCount: 0,
      },
      generatedAt: now.toISOString(),
      basedOn: params.input,
    };
  }

  const riskItems: ContactRiskItem[] = [];

  for (const c of contacts) {
    const staleDays = c.lastContactAt
      ? Math.floor((now.getTime() - c.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isStale = !c.lastContactAt || c.lastContactAt < staleThreshold;
    const isOverdue =
      c.nextActionDueAt != null && c.nextActionDueAt < overdueCutoff;
    const hasNoNextAction = !c.nextAction;
    const isCold = c.temperature === "COLD" && c.status === "CONTACTED";
    const isNew = c.status === "NEW";

    if (!isStale && !isOverdue && !hasNoNextAction && !isCold) continue;

    let riskLevel: ContactRiskItem["riskLevel"] = "low";
    let riskType: ContactRiskItem["riskType"] = "stale";
    let insight = "";
    let recommendation = "";

    if (isOverdue) {
      riskLevel = "high";
      riskType = "overdue";
      insight = `次アクションの期限が超過しています（${staleDays !== null ? `${staleDays.toString()}日停滞` : "停滞"}）。`;
      recommendation = "期限切れタスクを確認し、対応またはリスケジュールしてください。";
    } else if (isStale && staleDays !== null && staleDays >= 60) {
      riskLevel = "high";
      riskType = "stale";
      insight = `最終接点から ${staleDays.toString()}日 が経過しています。関係が薄れるリスクがあります。`;
      recommendation = "近況確認の連絡を送るか、アウトリーチ文を AI 事務所に依頼してください。";
    } else if (isStale) {
      riskLevel = "medium";
      riskType = "stale";
      insight = `最終接点から ${staleDays !== null ? staleDays.toString() : "30以上"}日 が経過しています。`;
      recommendation = "軽い近況報告メッセージを送るタイミングです。";
    } else if (hasNoNextAction && isNew) {
      riskLevel = "medium";
      riskType = "new_no_action";
      insight = "新規接点ですが次のアクションが未設定です。";
      recommendation = "接触方法と日程を決めて Next Action を設定しましょう。";
    } else if (hasNoNextAction) {
      riskLevel = "low";
      riskType = "no_next_action";
      insight = "次のアクションが設定されていません。";
      recommendation = "Contact Pipeline で Next Action を追加してください。";
    } else if (isCold) {
      riskLevel = "low";
      riskType = "cold_temperature";
      insight = "温度感が低いまま接触済みの状態が続いています。";
      recommendation = "関係を温めるアプローチ変更を検討してください。";
    }

    riskItems.push({
      contactId: c.id,
      organizationName: c.organizationName ?? "（名称未設定）",
      riskLevel,
      riskType,
      staleDays,
      nextActionDueAt: c.nextActionDueAt?.toISOString() ?? null,
      lastContactAt: c.lastContactAt?.toISOString() ?? null,
      status: c.status,
      temperature: c.temperature,
      insight,
      recommendation,
    });
  }

  // Sort: high → medium → low, then by staleDays desc
  riskItems.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const diff = order[a.riskLevel] - order[b.riskLevel];
    if (diff !== 0) return diff;
    return (b.staleDays ?? 0) - (a.staleDays ?? 0);
  });

  const highRiskCount = riskItems.filter((r) => r.riskLevel === "high").length;
  const mediumRiskCount = riskItems.filter((r) => r.riskLevel === "medium").length;
  const staleCount = riskItems.filter((r) => r.riskType === "stale").length;
  const overdueCount = riskItems.filter((r) => r.riskType === "overdue").length;
  const noNextActionCount = riskItems.filter(
    (r) => r.riskType === "no_next_action" || r.riskType === "new_no_action"
  ).length;

  const fallbackSummary =
    highRiskCount > 0
      ? `要注意接点が ${highRiskCount.toString()}件 あります。期限超過・長期停滞から優先的に対応してください。`
      : riskItems.length > 0
      ? `${riskItems.length.toString()}件の接点に改善余地があります。停滞・次アクション未設定を確認してください。`
      : "現在リスクの高い接点はありません。継続的な接点管理を続けてください。";

  // AI summary for richer insight
  const topContacts = riskItems.slice(0, 5);
  const aiResult =
    topContacts.length > 0
      ? await generateJson<{ summary: string; riskContacts: ContactRiskItem[] }>(
          `Contact Pipeline のリスク分析結果です。Manager 向けに状況を整理してください。
対象接点数: ${contacts.length.toString()}件
要注意（高）: ${highRiskCount.toString()}件 / 要注意（中）: ${mediumRiskCount.toString()}件
上位リスク接点:
${topContacts
  .map(
    (c) =>
      `- ${c.organizationName}: ${c.riskType} / ${c.staleDays !== null ? `${c.staleDays.toString()}日停滞` : "停滞日数不明"} / ${c.status}`
  )
  .join("\n")}

以下のJSON形式で返してください（riskContacts は入力の配列をそのまま保持し summaryのみ生成）:
{"summary":"Manager へのアドバイスを1〜2文で","riskContacts":[]}`,
          {
            systemPrompt:
              "あなたはクリエイターの対外関係管理を支援するAIアシスタントです。簡潔で実用的な日本語で答えてください。",
            maxTokens: 256,
            temperature: 0.4,
          }
        )
      : null;

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    riskContacts: riskItems.slice(0, 10),
    healthSummary: {
      totalContacts: contacts.length,
      highRiskCount,
      mediumRiskCount,
      staleCount,
      overdueCount,
      noNextActionCount,
    },
    generatedAt: now.toISOString(),
    basedOn: params.input,
  };
}
