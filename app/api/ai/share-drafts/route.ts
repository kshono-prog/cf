import { NextRequest, NextResponse } from "next/server";

import { generateJson } from "@/lib/ai";
import {
  buildFallbackShareDraft,
  parseShareDraftInput,
  parseShareDraftResult,
} from "@/lib/ai/shareDraft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShareDraftRouteResponse =
  | {
      ok: true;
      drafts: ReturnType<typeof buildFallbackShareDraft>;
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(
  request: NextRequest
): Promise<NextResponse<ShareDraftRouteResponse>> {
  try {
    const raw: unknown = await request.json().catch(() => null);
    const input = parseShareDraftInput(raw);

    if (!input) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SHARE_DRAFT_INPUT" },
        { status: 400 }
      );
    }

    const fallback = buildFallbackShareDraft(input);
    const aiResult = await generateJson<unknown>(
      [
        "あなたはクリエイターの公開ページを広めるための文面を作る編集者です。",
        "誇大表現、投資・利回りを想起させる表現、誤解を招く断定表現は禁止です。",
        "支援依頼として自然で、温度感のある文面にしてください。",
        "出力は JSON のみ。コードブロックは使わないでください。",
        "",
        `displayName: ${input.displayName}`,
        `username: ${input.username}`,
        `profile: ${input.profile ?? ""}`,
        `goalTitle: ${input.goalTitle ?? ""}`,
        `projectTitle: ${input.projectTitle ?? ""}`,
        `projectDescription: ${input.projectDescription ?? ""}`,
        `publicPageUrl: ${input.publicPageUrl}`,
        `progress: ${JSON.stringify(input.progress)}`,
        "",
        'JSON schema: {"xShort":"string","xLong":"string","instagramCaption":"string","storyShort":"string","simpleEnglish":"string","launchMessage":"string","progressUpdateMessage":"string"}',
      ].join("\n"),
      {
        systemPrompt:
          "Creator Founding の公開ページ用 SNS 下書きを JSON-only で返す。",
        maxTokens: 1000,
        temperature: 0.6,
      }
    );

    const parsed = parseShareDraftResult(aiResult);

    return NextResponse.json({
      ok: true,
      drafts: parsed ?? fallback,
    });
  } catch (error) {
    console.error("SHARE_DRAFT_POST_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "SHARE_DRAFT_POST_FAILED" },
      { status: 500 }
    );
  }
}
