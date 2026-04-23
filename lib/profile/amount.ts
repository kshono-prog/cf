export type Currency = "JPYC" | "USDC";

export function normalizeAmountInput(raw: string, cur: Currency): string {
  const sanitized = raw.replace(/[^\d.]/g, "");
  if (cur === "JPYC") {
    return sanitized.split(".")[0] || "";
  }

  const [head, ...rest] = sanitized.split(".");
  return head + (rest.length > 0 ? `.${rest.join("").replace(/\./g, "")}` : "");
}

export function addAmount(
  current: string,
  delta: string,
  cur: Currency
): string {
  const currentNormalized = normalizeAmountInput(current || "0", cur);
  const deltaNormalized = normalizeAmountInput(delta, cur);

  const currentNumber = Number(currentNormalized || "0");
  const deltaNumber = Number(deltaNormalized || "0");
  const sum = currentNumber + deltaNumber;

  if (!Number.isFinite(sum) || sum < 0) {
    return currentNormalized || "0";
  }

  if (cur === "JPYC") {
    return String(Math.floor(sum));
  }

  return sum.toFixed(2);
}
