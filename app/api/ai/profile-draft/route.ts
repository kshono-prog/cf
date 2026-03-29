import { NextRequest, NextResponse } from "next/server";

import { generateJson } from "@/lib/ai";
import {
  buildFallbackProfileDraft,
  parseProfileDraftInput,
  parseProfileDraftResult,
} from "@/lib/ai/profileDraft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileDraftRouteResponse =
  | {
      ok: true;
      draft: ReturnType<typeof buildFallbackProfileDraft>;
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(
  request: NextRequest
): Promise<NextResponse<ProfileDraftRouteResponse>> {
  try {
    const raw: unknown = await request.json().catch(() => null);
    const input = parseProfileDraftInput(raw);

    if (!input) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PROFILE_DRAFT_INPUT" },
        { status: 400 }
      );
    }

    const fallback = buildFallbackProfileDraft(input);
    const aiResult = await generateJson<unknown>(
      [
        "あなたはクリエイターの公開ページづくりを手伝う編集者です。",
        "誇大表現を避け、日本語中心で、現実的かつ保守的な提案だけを行ってください。",
        "目標金額は控えめにし、投資・利回り・誤解を招く表現を使わないでください。",
        "出力は JSON のみ。コードブロックは使わないでください。",
        "",
        `username: ${input.username ?? ""}`,
        `freeText: ${input.freeText}`,
        `existingDisplayName: ${input.existingDisplayName ?? ""}`,
        `existingProfile: ${input.existingProfile ?? ""}`,
        `existingGoalTitle: ${input.existingGoalTitle ?? ""}`,
        `existingSocials: ${JSON.stringify(input.existingSocials)}`,
        `existingYoutubeVideos: ${JSON.stringify(input.existingYoutubeVideos)}`,
        "",
        'JSON schema: {"displayName":"string","profile":"string","goalTitle":"string","suggestedProjectTitle":"string","suggestedProjectDescription":"string","suggestedGoalTargetJpyc":30000,"suggestedThemeColor":"#2563eb","suggestedSocialLinksNotes":["string"],"warnings":["string"]}',
      ].join("\n"),
      {
        systemPrompt:
          "Creator Founding の公開ページ向けプロフィール下書きを作る。提案は prose-first ではなく JSON-only で返す。",
        maxTokens: 900,
        temperature: 0.5,
      }
    );

    const parsed = parseProfileDraftResult(aiResult);

    return NextResponse.json({
      ok: true,
      draft: parsed ?? fallback,
    });
  } catch (error) {
    console.error("PROFILE_DRAFT_POST_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "PROFILE_DRAFT_POST_FAILED" },
      { status: 500 }
    );
  }
}
