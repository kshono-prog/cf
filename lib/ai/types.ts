// lib/ai/types.ts

export interface GenerateOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

/**
 * Thrown when a configured model ID is no longer available
 * (deprecated, removed, or not accessible with the current API key tier).
 * The fallback chain in index.ts catches this and tries the next provider.
 */
export class ModelUnavailableError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly modelId: string,
    cause?: unknown
  ) {
    super(`[ai] Model unavailable: ${providerName}/${modelId}`);
    this.name = "ModelUnavailableError";
    if (cause instanceof Error) {
      // Error.cause is ES2022; cast to avoid strict lib constraint
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
