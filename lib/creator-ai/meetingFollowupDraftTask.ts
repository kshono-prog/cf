import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { isRecord } from "@/lib/api/guards";

type ActionItem = {
  id: string;
  title: string;
  owner: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
};

type MeetingFollowupDraftOutput = {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  nextMeetingTopics: string[];
  shareableSummary: string;
  context: {
    meetingId: string | null;
    meetingTitle: string | null;
    scheduledAt: string | null;
  };
  basedOn: Prisma.InputJsonValue;
};

export function parseMeetingFollowupDraftInput(
  input: Prisma.InputJsonValue
): { meetingId?: string } | null {
  const raw = input as unknown;
  if (!isRecord(raw)) return {};
  return {
    meetingId: typeof raw.meetingId === "string" ? raw.meetingId : undefined,
  };
}

export async function buildMeetingFollowupDraftOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const parsed = parseMeetingFollowupDraftInput(params.input) ?? {};
  const { meetingId } = parsed;

  // Load meeting with notes
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
          status: true,
          notes: true,
          decisions: true,
          nextActionsSummary: true,
        },
      })
    : null;

  // If no meeting specified, find the most recent completed meeting with notes
  const targetMeeting =
    meeting ??
    (await prisma.meeting.findFirst({
      where: {
        creatorProfileId: params.creatorProfileId,
        status: "COMPLETED",
        OR: [{ notes: { not: null } }, { decisions: { not: null } }],
      },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        title: true,
        meetingType: true,
        scheduledAt: true,
        durationMinutes: true,
        status: true,
        notes: true,
        decisions: true,
        nextActionsSummary: true,
      },
    }));

  if (!targetMeeting) {
    return {
      summary:
        "フォローアップを生成するための会議メモが見つかりませんでした。会議の status を COMPLETED にして notes を記入してから再度お試しください。",
      actionItems: [],
      decisions: [],
      nextMeetingTopics: [],
      shareableSummary: "",
      context: { meetingId: null, meetingTitle: null, scheduledAt: null },
      basedOn: params.input,
    };
  }

  const fallbackActionItems: ActionItem[] = targetMeeting.nextActionsSummary
    ? [
        {
          id: "action-1",
          title: targetMeeting.nextActionsSummary.slice(0, 100),
          owner: null,
          dueDate: null,
          priority: "medium" as const,
        },
      ]
    : [];

  const fallbackDecisions: string[] = targetMeeting.decisions
    ? [targetMeeting.decisions.slice(0, 200)]
    : [];

  const fallbackSummary = targetMeeting.notes
    ? `${targetMeeting.title} の議事メモをもとにフォローアップを整理しました。`
    : `${targetMeeting.title} のフォローアップを整理しました。`;

  const notesForAi = [
    targetMeeting.notes,
    targetMeeting.decisions ? `【決定事項】${targetMeeting.decisions}` : null,
    targetMeeting.nextActionsSummary
      ? `【次アクション】${targetMeeting.nextActionsSummary}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!notesForAi.trim()) {
    return {
      summary: fallbackSummary,
      actionItems: fallbackActionItems,
      decisions: fallbackDecisions,
      nextMeetingTopics: [],
      shareableSummary: fallbackSummary,
      context: {
        meetingId: targetMeeting.id,
        meetingTitle: targetMeeting.title,
        scheduledAt: targetMeeting.scheduledAt?.toISOString() ?? null,
      },
      basedOn: params.input,
    };
  }

  type AiFollowup = {
    summary: string;
    actionItems: Array<{
      id: string;
      title: string;
      owner: string | null;
      dueDate: string | null;
      priority: "high" | "medium" | "low";
    }>;
    decisions: string[];
    nextMeetingTopics: string[];
    shareableSummary: string;
  };

  const aiResult = await generateJson<AiFollowup>(
    `以下の会議メモから、構造化フォローアップを生成してください。

会議: ${targetMeeting.title}
日時: ${targetMeeting.scheduledAt ? new Date(targetMeeting.scheduledAt).toLocaleString("ja-JP") : "不明"}
種別: ${targetMeeting.meetingType}

議事メモ:
${notesForAi}

以下の JSON 形式のみで返してください:
{
  "summary": "この会議の成果を1〜2文で",
  "actionItems": [
    {"id":"a-1","title":"タスク名","owner":"担当者名またはnull","dueDate":"YYYY-MM-DDまたはnull","priority":"high|medium|low"}
  ],
  "decisions": ["決定事項1","決定事項2"],
  "nextMeetingTopics": ["次回議題1","次回議題2"],
  "shareableSummary": "参加者に共有できる1〜3文の会議まとめ"
}

actionItems は3〜7件、decisions は1〜5件、nextMeetingTopics は1〜3件にしてください。`,
    {
      systemPrompt:
        "あなたは会議の議事録から構造化フォローアップを作成するAIアシスタントです。具体的で実行可能な日本語のアクション項目を生成してください。",
      maxTokens: 800,
      temperature: 0.3,
    }
  ).catch(() => null);

  const output: MeetingFollowupDraftOutput = {
    summary: aiResult?.summary ?? fallbackSummary,
    actionItems:
      aiResult?.actionItems?.length ? aiResult.actionItems.slice(0, 8) : fallbackActionItems,
    decisions:
      aiResult?.decisions?.length ? aiResult.decisions : fallbackDecisions,
    nextMeetingTopics: aiResult?.nextMeetingTopics ?? [],
    shareableSummary: aiResult?.shareableSummary ?? fallbackSummary,
    context: {
      meetingId: targetMeeting.id,
      meetingTitle: targetMeeting.title,
      scheduledAt: targetMeeting.scheduledAt?.toISOString() ?? null,
    },
    basedOn: params.input,
  };

  return output as unknown as Prisma.InputJsonValue;
}
