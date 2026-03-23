// lib/ai/openaiProvider.ts
// Priority 2: OpenAI — limited free credits for new users

import OpenAI from "openai";

import type { AiProvider, GenerateOptions } from "./types";
import { ModelUnavailableError, extractApiErrorInfo, formatApiErrorSummary } from "./types";

const MODEL_ID = "gpt-4.1-nano";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const client = new OpenAI({ apiKey });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    try {
      const response = await client.chat.completions.create({
        model: MODEL_ID,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
      });
      return response.choices[0]?.message.content ?? "";
    } catch (err) {
      if (isModelUnavailable(err)) {
        throw new ModelUnavailableError(this.name, MODEL_ID, err);
      }
      const info = extractApiErrorInfo(err);
      const summary = formatApiErrorSummary(info);
      console.error(`[openai] API error | ${summary}`);
      throw err;
    }
  }
}

function isModelUnavailable(err: unknown): boolean {
  // OpenAI SDK wraps API errors in APIError with a `code` and `status` field
  if (err !== null && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (
      e.status === 404 ||
      e.code === "model_not_found" ||
      e.code === "model_not_available" ||
      e.code === "model_deprecated"
    ) {
      return true;
    }
    // Fallback: check message string
    const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
    if (
      msg.includes("model_not_found") ||
      msg.includes("model not found") ||
      msg.includes("deprecated")
    ) {
      return true;
    }
  }
  return false;
}
