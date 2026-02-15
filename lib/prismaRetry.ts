import { Prisma } from "@prisma/client";

const RETRYABLE_CODES = new Set(["P1017", "P2024", "P1001", "P1008"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePrismaError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : undefined;

    const msg = (error.message || "").toLowerCase();
    const retryByCode = code ? RETRYABLE_CODES.has(code) : false;
    const retryByMessage =
      msg.includes("server has closed the connection") ||
      msg.includes("unable to check out connection from the pool") ||
      msg.includes("terminating connection due to administrator command") ||
      msg.includes("timed out fetching a new connection from the connection pool");

    return retryByCode || retryByMessage;
  }

  if (error instanceof Error) {
    const msg = (error.message || "").toLowerCase();
    return (
      msg.includes("server has closed the connection") ||
      msg.includes("unable to check out connection from the pool")
    );
  }

  return false;
}

export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    maxAttempts?: number;
    baseDelayMs?: number;
  }
): Promise<T> {
  // 接続逼迫時の負荷増幅を避けるため、デフォルトは1回だけ再試行
  const maxAttempts = Math.max(1, opts?.maxAttempts ?? 2);
  const baseDelayMs = Math.max(1, opts?.baseDelayMs ?? 180);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryablePrismaError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 30);
      const backoff = baseDelayMs * attempt + jitter;
      await sleep(backoff);
    }
  }

  throw lastError;
}
