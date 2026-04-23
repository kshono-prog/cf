import { describe, expect, it } from "vitest";

import {
  parseJsonObjectOrArray,
  parseTxHashesText,
} from "@/lib/mypage/parsers";

describe("parseJsonObjectOrArray", () => {
  it("accepts a JSON array", () => {
    expect(parseJsonObjectOrArray('["0xabc"]')).toEqual(["0xabc"]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonObjectOrArray("{invalid")).toBeNull();
  });
});

describe("parseTxHashesText", () => {
  it("parses a JSON array of hashes", () => {
    expect(parseTxHashesText('["0xabc","0xdef"]')).toEqual([
      "0xabc",
      "0xdef",
    ]);
  });

  it("parses newline-delimited hashes", () => {
    expect(parseTxHashesText("0xabc\n0xdef\n")).toEqual(["0xabc", "0xdef"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseTxHashesText("   ")).toEqual([]);
  });

  it("returns null for invalid JSON arrays", () => {
    expect(parseTxHashesText("[1,2]")).toBeNull();
  });
});
