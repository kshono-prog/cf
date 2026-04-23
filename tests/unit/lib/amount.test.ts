import { describe, expect, it } from "vitest";

import { addAmount, normalizeAmountInput } from "@/lib/profile/amount";

describe("normalizeAmountInput", () => {
  it("normalizes JPYC amounts to integers", () => {
    expect(normalizeAmountInput("1,234.56", "JPYC")).toBe("1234");
  });

  it("keeps decimals for USDC", () => {
    expect(normalizeAmountInput("12.34", "USDC")).toBe("12.34");
  });

  it("removes invalid characters", () => {
    expect(normalizeAmountInput("abc1x.2z3", "USDC")).toBe("1.23");
  });
});

describe("addAmount", () => {
  it("formats JPYC sums as floored integers", () => {
    expect(addAmount("100", "50.8", "JPYC")).toBe("150");
  });

  it("formats USDC sums with two decimals", () => {
    expect(addAmount("1.25", "0.5", "USDC")).toBe("1.75");
  });
});
