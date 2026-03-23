// lib/ai/anthropicProvider.ts
// Priority 3: Anthropic Claude — pay-as-you-go only (no free tier)

import Anthropic from "@anthropic-ai/sdk";

import type { AiProvider, GenerateOptions } from "./types";
import { ModelUnavailableError, extractApiErrorInfo, formatApiErrorSummary } from "./types";

const MODEL_ID = "claude-haiku-4-5-20251001";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const client = new Anthropic({ apiKey });

    try {
      const response = await client.messages.create({
        model: MODEL_ID,
        max_tokens: options.maxTokens ?? 2048,
        ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: [{ role: "user", content: prompt }],
      });

      const block = response.content[0];
      if (block.type !== "text") return "";
      return block.text;
    } catch (err) {
      if (isModelUnavailable(err)) {
        throw new ModelUnavailableError(this.name, MODEL_ID, err);
      }
      const info = extractApiErrorInfo(err);
      const summary = formatApiErrorSummary(info);
      console.error(`[anthropic] API error | ${summary}`);
      throw err;
    }
  }
}

function isModelUnavailable(err: unknown): boolean {
  if (err !== null && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // Anthropic SDK: APIError has status and error.type
    if (e.status === 404) return true;
    const inner = e.error as Record<string, unknown> | null | undefined;
    if (inner?.type === "not_found_error") return true;
    const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
    if (msg.includes("not found") || msg.includes("deprecated")) return true;
  }
  return false;
}
