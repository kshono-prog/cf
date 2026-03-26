import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { isRecord } from "@/lib/api/guards";

type AgendaItem = {
  id: string;
  title: string;
  durationMinutes: number | null;
  notes: string | null;
};

type MeetingAgendaDraftOutput = {
  summary: string;
  agenda: AgendaItem[];
  preReadItems: string[];
  decisionsNeeded: string[];
  context: {
    meetingId: string | null;
    meetingTitle: string | null;
    scheduledAt: string | null;
    recentNoteCount: number;
    recentMeetingCount: number;
  };
  basedOn: Prisma.InputJsonValue;
};

export function parseMeetingAgendaDraftInput(
  input: Prisma.InputJsonValue
): { meetingId?: string; purpose?: string } | null {
  const raw = input as unknown;
  if (!isRecord(raw)) return {};
  return {
    meetingId: typeof raw.meetingId === "string" ? raw.meetingId : undefined,
    purpose: typeof raw.purpose === "string" ? raw.purpose : undefined,
  };
}

export async function buildMeetingAgendaDraftOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const since14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const parsed = parseMeetingAgendaDraftInput(params.input) ?? {};
  const { meetingId, purpose } = parsed;

  // Load meeting if meetingId provided
  const meeting = meetingId
    ? await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          creatorProfileId: params.creatorProfileId,
        },
        select: {
          id: true,
          title: true,
          meetingType: true,
          scheduledAt: true,
          durationMinutes: true,
          locationText: true,
          agenda: true,
          notes: true,
        },
      })
    : null;

  // Load recent notes for this creator (shared or internal)
  const [recentNotes, recentMeetings] = await Promise.all([
    prisma.managerNote.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        createdAt: { gte: since14Days },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        title: true,
        body: true,
        noteType: true,
        followUpNeeded: true,
        aiSummary: true,
      },
    }),
    prisma.meeting.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        status: "COMPLETED",
        scheduledAt: { gte: since14Days },
      },
      orderBy: { scheduledAt: "desc" },
      take: 3,
      select: {
        title: true,
        decisions: true,
        nextActionsSummary: true,
        scheduledAt: true,
      },
    }),
  ]);

  // Build fallback agenda from context
  const fallbackAgenda: AgendaItem[] = [
    {
      id: "opening",
      title: "開始・前回の振り返り",
      durationMinutes: 5,
      notes: recentMeetings[0]?.decisions
        ? `前回の決定事項: ${recentMeetings[0].decisions.slice(0, 100)}`
        : null,
    },
    {
      id: "main",
      title: purpose ?? meeting?.title ?? "メインアジェンダ",
      durationMinutes: meeting?.durationMinutes ? meeting.durationMinutes - 15 : 30,
      notes: meeting?.notes?.slice(0, 200) ?? null,
    },
    {
      id: "decisions",
      title: "決定事項・次アクション確認",
      durationMinutes: 10,
      notes: null,
    },
  ];

  const followUpItems = recentNotes
    .filter((n) => n.followUpNeeded)
    .map((n) => n.title ?? n.aiSummary ?? "フォローアップ項目")
    .slice(0, 3);

  const fallbackPreRead = [
    ...(recentNotes.length > 0
      ? [`直近 ${recentNotes.length.toString()}件のマネージャーノートを確認`]
      : []),
    ...(recentMeetings.length > 0
      ? [`前回会議 (${new Date(recentMeetings[0].scheduledAt).toLocaleDateString("ja-JP")}) の決定事項を確認`]
      : []),
  ];

  const fallbackDecisions = [
    ...(followUpItems.length > 0 ? followUpItems : ["今後の方向性を確認"]),
  ];

  const fallbackSummary = meeting
    ? `${meeting.title} の事前アジェンダを整理しました。`
    : `会議アジェンダを ${fallbackAgenda.length.toString()}項目 整理しました。`;

  // AI enhancement
  const notesSummary = recentNotes
    .map((n) => `- ${n.title ?? ""}${n.aiSummary ? `: ${n.aiSummary}` : ""}`)
    .join("\n");
  const meetingsSummary = recentMeetings
    .map(
      (m) =>
        `- ${m.title} (${new Date(m.scheduledAt).toLocaleDateString("ja-JP")}): ${m.decisions?.slice(0, 100) ?? "決定事項なし"}`
    )
    .join("\n");

  const aiResult = await generateJson<{
    summary: string;
    agenda: AgendaItem[];
    preReadItems: string[];
    decisionsNeeded: string[];
  }>(
    `会議のアジェンダを作成してください。

会議タイトル: ${meeting?.title ?? purpose ?? "未設定"}
開催日時: ${meeting?.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString("ja-JP") : "未設定"}
時間: ${meeting?.durationMinutes ? `${meeting.durationMinutes.toString()}分` : "未設定"}
場所/方法: ${meeting?.locationText ?? "未設定"}
既存メモ: ${meeting?.notes ?? "なし"}

直近2週間のマネージャーノート:
${notesSummary || "なし"}

直近2週間の完了会議:
${meetingsSummary || "なし"}

以下のJSON形式のみで返してください:
{"summary":"この会議の目的を一文で","agenda":[{"id":"item-1","title":"アジェンダ項目","durationMinutes":15,"notes":"補足（省略可）"}],"preReadItems":["事前確認すべきこと"],"decisionsNeeded":["この会議で決めるべきこと"]}

agenda は2〜5項目、preReadItems は1〜3件、decisionsNeeded は1〜3件にしてください。`,
    {
      systemPrompt:
        "あなたは会議ファシリテーターです。実用的で簡潔な日本語のアジェンダを作成してください。",
      maxTokens: 768,
      temperature: 0.4,
    }
  );

  const finalSummary = aiResult?.summary ?? fallbackSummary;
  const finalAgenda =
    aiResult?.agenda?.length ? aiResult.agenda.slice(0, 6) : fallbackAgenda;
  const finalPreRead =
    aiResult?.preReadItems?.length ? aiResult.preReadItems : fallbackPreRead;
  const finalDecisions =
    aiResult?.decisionsNeeded?.length ? aiResult.decisionsNeeded : fallbackDecisions;

  const output: MeetingAgendaDraftOutput = {
    summary: finalSummary,
    agenda: finalAgenda,
    preReadItems: finalPreRead,
    decisionsNeeded: finalDecisions,
    context: {
      meetingId: meeting?.id ?? null,
      meetingTitle: meeting?.title ?? null,
      scheduledAt: meeting?.scheduledAt?.toISOString() ?? null,
      recentNoteCount: recentNotes.length,
      recentMeetingCount: recentMeetings.length,
    },
    basedOn: params.input,
  };

  return output as unknown as Prisma.InputJsonValue;
}
