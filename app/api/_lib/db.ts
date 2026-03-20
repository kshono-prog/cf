// app/api/_lib/db.ts
import { prisma } from "@/lib/prisma";
import { normalizeAddress as canonicalNormalizeAddress } from "@/lib/api/guards";
import { Prisma } from "@prisma/client";

export { prisma, Prisma };

export function toIdString(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

export function parseBigIntId(raw: string): bigint {
  // BigIntにできないものは例外
  return BigInt(raw);
}

export function normalizeAddress(addr: string): string {
  return canonicalNormalizeAddress(String(addr || ""));
}

export function nowIso() {
  return new Date().toISOString();
}
