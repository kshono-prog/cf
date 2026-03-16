import { NextRequest, NextResponse } from "next/server";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  buildTranslationsOutput,
  parseTranslationTaskInput,
  toLanguageCode,
  type LanguageCode,
} from "@/lib/translation";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  text?: unknown;
  from?: unknown;
  to?: unknown;
};

function parseTargets(v: unknown): LanguageCode[] | null {
  if (!Array.isArray(v)) return null;
  const out: LanguageCode[] = [];
  for (const item of v) {
    const code = toLanguageCode(item);
    if (!code) return null;
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;

    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;

    const text = toNonEmptyString(body.text);
    if (!text) return errJson("TEXT_REQUIRED", 400);

    const from = body.from == null ? null : toLanguageCode(body.from);
    if (body.from != null && !from) return errJson("FROM_LANGUAGE_INVALID", 400);

    const targets = parseTargets(body.to);
    if (!targets || targets.length === 0) return errJson("TARGET_LANGUAGES_INVALID", 400);

    const taskInput = parseTranslationTaskInput({
      text,
      from: from ?? "auto",
      to: targets,
    });
    if (!taskInput) return errJson("TRANSLATION_INPUT_INVALID", 400);

    return okJson({
      sourceLanguage: taskInput.from,
      translations: buildTranslationsOutput(taskInput),
    });
  } catch (e) {
    console.error("TRANSLATION_POST_FAILED", e);
    return errJson("TRANSLATION_POST_FAILED", 500);
  }
}
