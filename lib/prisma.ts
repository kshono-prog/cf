// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { getDatabaseEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// 起動時に DATABASE_URL の存在とスキームを検証する。
// 欠落・不正フォーマット時は MISSING_DATABASE_URL / INVALID_DATABASE_URL でクラッシュする。
const { databaseUrl } = getDatabaseEnv();

function tuneRuntimeDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const isSupabase = url.hostname.includes("supabase.com");
    const isPooler =
      url.port === "6543" || url.searchParams.get("pgbouncer") === "true";
    const isProductionRuntime = process.env.NODE_ENV === "production";
    const isProductionBuild =
      process.env.npm_lifecycle_event === "build" ||
      process.env.NEXT_PHASE === "phase-production-build";

    // Supabase pooler 利用時は接続数を低く保ちつつ、
    // 公開プロフィールのような read-heavy route が 20秒単位でぶら下がらない値へ寄せる。
    if (isSupabase && isPooler) {
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set(
          "connection_limit",
          isProductionBuild ? "8" : isProductionRuntime ? "3" : "1"
        );
      }
      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set(
          "pool_timeout",
          isProductionBuild ? "20" : isProductionRuntime ? "5" : "20"
        );
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set(
          "connect_timeout",
          isProductionBuild ? "10" : isProductionRuntime ? "5" : "10"
        );
      }
      return url.toString();
    }
  } catch {
    // URL パース失敗時は元値をそのまま使用（getDatabaseEnv で事前検証済み）
  }

  return rawUrl;
}

const runtimeDatabaseUrl = tuneRuntimeDatabaseUrl(databaseUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl } },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
