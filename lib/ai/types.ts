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

// ─── API error extraction ─────────────────────────────────────────────────────

/**
 * Structured representation of an API error from any AI provider SDK.
 * Fields are populated on a best-effort basis — each SDK exposes different shapes.
 */
export interface ApiErrorInfo {
  /** HTTP status code (401, 402, 429, 500, 529, …) */
  status?: number;
  /** Provider-specific error code string (e.g. "insufficient_quota", "rate_limit_exceeded") */
  code?: string;
  /** Provider-specific error type string (e.g. "authentication_error", "billing_error") */
  type?: string;
  /** Human-readable error message from the API response body */
  errorMessage?: string;
}

/**
 * Extract structured error info from any AI SDK error object.
 *
 * Handles:
 *  - Anthropic SDK: APIError → { status, error.type, error.message }
 *  - OpenAI SDK:    APIError → { status, code, type, message }
 *  - Gemini SDK:    GoogleGenerativeAIFetchError → { status, message }
 */
export function extractApiErrorInfo(err: unknown): ApiErrorInfo {
  if (err === null || typeof err !== "object") return {};
  const e = err as Record<string, unknown>;

  // HTTP status: present on Anthropic APIError, OpenAI APIError, GoogleGenerativeAIFetchError
  const status = typeof e.status === "number" ? e.status : undefined;

  // OpenAI: `.code` (e.g. "insufficient_quota") and `.type` (e.g. "requests")
  const code = typeof e.code === "string" ? e.code : undefined;
  const type = typeof e.type === "string" ? e.type : undefined;

  // Anthropic: `.error` object containing `.type` and `.message`
  const inner =
    e.error !== null && typeof e.error === "object"
      ? (e.error as Record<string, unknown>)
      : null;
  const innerType =
    inner && typeof inner.type === "string" ? inner.type : undefined;
  const innerMessage =
    inner && typeof inner.message === "string" ? inner.message : undefined;

  // Top-level message (all SDKs)
  const topMessage = typeof e.message === "string" ? e.message : undefined;

  // Parse status from Gemini message strings like "Error fetching from ... [429 Too Many Requests]"
  let geminiStatus: number | undefined;
  if (status === undefined && topMessage) {
    const m = /\[(\d{3})\s/.exec(topMessage) ?? /\b(\d{3})\b/.exec(topMessage);
    if (m) {
      const parsed = parseInt(m[1], 10);
      if (parsed >= 400 && parsed < 600) geminiStatus = parsed;
    }
  }

  return {
    status: status ?? geminiStatus,
    code,
    type: type ?? innerType,
    errorMessage: innerMessage ?? topMessage,
  };
}

/**
 * Returns true when the error is clearly billing/quota related.
 * Used to emit a more prominent log entry.
 */
export function isBillingError(info: ApiErrorInfo): boolean {
  const { status, code, type } = info;
  if (status === 402) return true;
  if (
    code === "insufficient_quota" ||
    code === "billing_not_active" ||
    code === "quota_exceeded"
  )
    return true;
  if (
    type === "billing_error" ||
    type === "insufficient_quota" ||
    type === "quota_exceeded"
  )
    return true;
  // Gemini: message contains "RESOURCE_EXHAUSTED" or "quota"
  const msg = (info.errorMessage ?? "").toLowerCase();
  if (msg.includes("resource_exhausted") || msg.includes("billing")) return true;
  return false;
}

/**
 * Returns true when the error is a rate-limit (transient, retry-able).
 */
export function isRateLimitError(info: ApiErrorInfo): boolean {
  if (info.status === 429) return true;
  if (info.code === "rate_limit_exceeded") return true;
  if (info.type === "rate_limit_error") return true;
  return false;
}

/**
 * Format a one-line summary of the error for logging.
 * Example: "HTTP 429 | code=rate_limit_exceeded | Too many requests"
 */
export function formatApiErrorSummary(info: ApiErrorInfo): string {
  const parts: string[] = [];
  if (info.status !== undefined) parts.push(`HTTP ${info.status}`);
  if (info.code) parts.push(`code=${info.code}`);
  if (info.type) parts.push(`type=${info.type}`);
  if (info.errorMessage) parts.push(info.errorMessage.slice(0, 200));
  return parts.length > 0 ? parts.join(" | ") : "(no detail)";
}
