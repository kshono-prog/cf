// lib/ai/index.ts
// Unified AI client with provider fallback chain.
//
// Priority order (free tier availability):
//   1. Gemini     — GEMINI_API_KEY      gemini-2.0-flash-lite (generous free tier)
//   2. OpenAI     — OPENAI_API_KEY      gpt-4.1-nano
//   3. Anthropic  — ANTHROPIC_API_KEY   claude-haiku-4-5 (pay-as-you-go)
//
// Fallback behavior:
//   - ModelUnavailableError → skip to next provider in chain (model deprecated/removed)
//   - Other error           → skip to next provider in chain (transient / auth / quota)
//   - No key configured     → skip provider
//   - All exhausted         → return null; caller falls back to rule-based output

import { GeminiProvider } from "./geminiProvider";
import { OpenAiProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import type { AiProvider, GenerateOptions } from "./types";
import {
  ModelUnavailableError,
  extractApiErrorInfo,
  formatApiErrorSummary,
  isBillingError,
  isRateLimitError,
} from "./types";

export type { AiProvider, GenerateOptions };
export { ModelUnavailableError, extractApiErrorInfo, formatApiErrorSummary, isBillingError, isRateLimitError };

const PROVIDERS: AiProvider[] = [
  new GeminiProvider(),
  new OpenAiProvider(),
  new AnthropicProvider(),
];

/** Returns all providers that have a key configured, in priority order. */
function availableProviders(): AiProvider[] {
  return PROVIDERS.filter((p) => p.isAvailable());
}

/** Returns the highest-priority configured provider, or null. */
export function resolveAiProvider(): AiProvider | null {
  return availableProviders()[0] ?? null;
}

/**
 * Generate text using the best available AI provider.
 * Automatically falls back to the next provider if a model is unavailable
 * or another error occurs.
 * Returns null when no provider succeeds or none are configured.
 */
export async function generateText(
  prompt: string,
  options?: GenerateOptions
): Promise<string | null> {
  const providers = availableProviders();
  if (providers.length === 0) {
    console.warn("[ai] No AI providers configured. Returning null.");
    return null;
  }

  const tried: string[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const start = Date.now();
    try {
      const result = await provider.generate(prompt, options);
      const ms = Date.now() - start;
      if (tried.length > 0) {
        console.info(
          `[ai] ✓ ${provider.name} succeeded after fallback from [${tried.join(" → ")}] in ${ms.toString()}ms`
        );
      } else {
        console.info(`[ai] ✓ ${provider.name} succeeded in ${ms.toString()}ms`);
      }
      return result;
    } catch (err) {
      tried.push(provider.name);
      if (err instanceof ModelUnavailableError) {
        // Model has been deprecated or removed — log prominently and try next
        console.warn(
          `[ai] ⚠ Model unavailable (${err.providerName}/${err.modelId}). ` +
            `Update the model ID in lib/ai/${err.providerName}Provider.ts. ` +
            `Falling back to next provider.`
        );
      } else {
        const info = extractApiErrorInfo(err);
        const summary = formatApiErrorSummary(info);
        if (isRateLimitError(info)) {
          console.warn(
            `[ai] ⏱ Rate limit — ${provider.name} | ${summary}`
          );
        } else if (isBillingError(info)) {
          console.error(
            `[ai] 🚨 BILLING/QUOTA ERROR — ${provider.name} | ${summary}`
          );
        } else {
          console.error(
            `[ai] ${provider.name} failed | ${summary}`
          );
        }
      }
      const next = providers[i + 1];
      if (next) {
        console.info(`[ai] → Falling back: ${provider.name} → ${next.name}`);
      }
      // Try the next provider in the chain
      continue;
    }
  }

  console.error(
    `[ai] ✗ All providers exhausted [${tried.join(" → ")}]. Returning null.`
  );
  return null;
}

/**
 * Generate JSON output using AI, parsed from a markdown code fence or raw JSON.
 * Returns null if AI is unavailable or the response cannot be parsed as JSON.
 */
export async function generateJson<T>(
  prompt: string,
  options?: GenerateOptions
): Promise<T | null> {
  const raw = await generateText(prompt, options);
  if (!raw) return null;

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    console.warn(
      `[ai] ✗ JSON parse failed. Response (first 200 chars): ${stripped.slice(0, 200)}`
    );
    return null;
  }
}
