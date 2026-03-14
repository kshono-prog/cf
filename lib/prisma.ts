// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function tuneRuntimeDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    const isSupabase = url.hostname.includes("supabase.com");
    const isPooler =
      url.port === "6543" || url.searchParams.get("pgbouncer") === "true";

    // Supabase pooler を使う実行時接続は、環境を問わず明示的に 1接続へ寄せる。
    // これで長時間利用時や複数ルート遷移時の connection 枯渇を起こしにくくする。
    if (isSupabase && isPooler) {
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "20");
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "10");
      }
      return url.toString();
    }
  } catch {
    // URL パース失敗時は元値をそのまま使用
  }

  return rawUrl;
}

const runtimeDatabaseUrl = tuneRuntimeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(runtimeDatabaseUrl
      ? { datasources: { db: { url: runtimeDatabaseUrl } } }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
