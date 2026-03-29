import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

type RenewalAlertItem = {
  contactId: string;
  organizationName: string;
  contactType: string;
  contractStatus: string | null;
  contractStartAt: string | null;
  ageMonths: number | null;
  urgency: "high" | "medium" | "low";
  reason: string;
  recommendation: string;
};

export async function buildContractRenewalAlertOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();

  const contacts = await prisma.externalContact.findMany({
    where: {
      creatorProfileId: params.creatorProfileId,
      isArchived: false,
      OR: [
        { contractStartAt: { not: null } },
        { contractStatus: { not: null } },
      ],
    },
    select: {
      id: true,
      organizationName: true,
      contactType: true,
      contractStatus: true,
      contractStartAt: true,
      status: true,
      temperature: true,
    },
    orderBy: { contractStartAt: "asc" },
    take: 50,
  });

  if (contacts.length === 0) {
    return {
      summary:
        "契約情報が登録されている接点がまだありません。Contact Pipeline で contractStartAt または contractStatus を設定すると更新アラートを確認できます。",
      renewalAlerts: [],
      stats: { total: 0, highCount: 0, mediumCount: 0 },
      generatedAt: now.toISOString(),
      basedOn: params.input,
    };
  }

  const alerts: RenewalAlertItem[] = [];

  for (const c of contacts) {
    let ageMonths: number | null = null;
    let urgency: RenewalAlertItem["urgency"] = "low";
    let reason = "";
    let recommendation = "";

    if (c.contractStartAt) {
      const ms = now.getTime() - c.contractStartAt.getTime();
      ageMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
      // Annual contract cycle: warn at 10+ months (renewal window), alert at 12+
      if (ageMonths >= 12) {
        urgency = "high";
        reason = `契約開始から ${ageMonths.toString()}ヶ月 が経過しています。年間契約の更新タイミングを超過している可能性があります。`;
        recommendation = "契約更新の意思確認をすぐに行い、条件を再確認してください。";
      } else if (ageMonths >= 10) {
        urgency = "medium";
        reason = `契約開始から ${ageMonths.toString()}ヶ月 が経過しており、更新交渉の準備期間に入っています。`;
        recommendation = "更新に向けた条件整理と先方への確認連絡を準備してください。";
      } else if (c.contractStatus) {
        urgency = "low";
        reason = `契約ステータスが「${c.contractStatus}」に設定されています。`;
        recommendation = "契約ステータスを確認し、必要であれば更新を進めてください。";
      }
    } else if (c.contractStatus) {
      urgency = "low";
      reason = `契約ステータスが「${c.contractStatus}」に設定されています（開始日未登録）。`;
      recommendation = "契約開始日を記録し、更新サイクル管理に役立てましょう。";
    }

    if (urgency === "low" && ageMonths !== null && ageMonths < 10) continue;

    alerts.push({
      contactId: c.id,
      organizationName: c.organizationName,
      contactType: c.contactType,
      contractStatus: c.contractStatus,
      contractStartAt: c.contractStartAt?.toISOString() ?? null,
      ageMonths,
      urgency,
      reason,
      recommendation,
    });
  }

  alerts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const diff = order[a.urgency] - order[b.urgency];
    if (diff !== 0) return diff;
    return (b.ageMonths ?? 0) - (a.ageMonths ?? 0);
  });

  const highCount = alerts.filter((a) => a.urgency === "high").length;
  const mediumCount = alerts.filter((a) => a.urgency === "medium").length;

  const fallbackSummary =
    highCount > 0
      ? `更新期限超過の契約が ${highCount.toString()}件 あります。すぐに相手方への確認を行ってください。`
      : mediumCount > 0
      ? `${mediumCount.toString()}件 の契約が更新交渉ウィンドウに入っています。事前準備を始めましょう。`
      : alerts.length > 0
      ? "契約ステータスに要確認の接点があります。"
      : "現在、更新アクションが必要な契約はありません。";

  const topAlerts = alerts.slice(0, 5);
  const aiResult =
    topAlerts.length > 0
      ? await generateJson<{ summary: string }>(
          `クリエイターの契約更新アラートです。Manager 向けに状況を整理してください。
対象契約接点数: ${contacts.length.toString()}件
要更新（高）: ${highCount.toString()}件 / 準備開始（中）: ${mediumCount.toString()}件
上位アラート:
${topAlerts
  .map(
    (a) =>
      `- ${a.organizationName}（${a.contactType}）: ${a.reason}`
  )
  .join("\n")}

{"summary":"Manager へのアドバイスを1〜2文で"}`,
          {
            systemPrompt:
              "あなたはクリエイターの契約管理を支援するAIアシスタントです。簡潔で実用的な日本語で答えてください。",
            maxTokens: 200,
            temperature: 0.4,
          }
        ).catch(() => null)
      : null;

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    renewalAlerts: alerts.slice(0, 10),
    stats: {
      total: contacts.length,
      highCount,
      mediumCount,
    },
    generatedAt: now.toISOString(),
    basedOn: params.input,
  };
}
