import type { Prisma } from "@prisma/client";

export type CurrencyCode = "JPYC" | "USDC";

export function toCurrency(v: unknown): CurrencyCode | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

export function decToString(d: Prisma.Decimal | null | undefined): string | null {
  if (d == null) return null;
  return d.toString();
}

export function decimalToAmountByCurrency(
  currency: CurrencyCode,
  amountDecimal: Prisma.Decimal | null
): number {
  if (!amountDecimal) return 0;
  if (currency === "USDC") {
    const n = Number(amountDecimal.toString());
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(2));
  }
  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
