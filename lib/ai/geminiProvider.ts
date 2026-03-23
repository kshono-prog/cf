// lib/ai/geminiProvider.ts
// Priority 1: Google Gemini — generous free tier via AI Studio

import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";

import type { AiProvider, GenerateOptions } from "./types";
import { ModelUnavailableError, extractApiErrorInfo, formatApiErrorSummary } from "./types";

const MODEL_ID = "gemini-2.0-flash-lite";

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
      },
      ...(options.systemPrompt
        ? { systemInstruction: options.systemPrompt }
        : {}),
    });

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (isModelUnavailable(err)) {
        throw new ModelUnavailableError(this.name, MODEL_ID, err);
      }
      const info = extractApiErrorInfo(err);
      const summary = formatApiErrorSummary(info);
      console.error(`[gemini] API error | ${summary}`);
      throw err;
    }
  }
}

function isModelUnavailable(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIError) {
    const msg = err.message.toLowerCase();
    // 404 / model not found / model deprecated
    return (
      msg.includes("not found") ||
      msg.includes("model_not_found") ||
      msg.includes("404") ||
      msg.includes("deprecated") ||
      msg.includes("unavailable")
    );
  }
  return false;
}
