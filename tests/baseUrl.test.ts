import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBaseUrlFromHeaders,
  resolveBaseUrlFromRequestUrl,
  withBaseUrl,
} from "@/utils/baseUrl";

function createHeaders(entries: Record<string, string>): Pick<Headers, "get"> {
  const normalized = new Map(
    Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    get(name: string): string | null {
      return normalized.get(name.toLowerCase()) ?? null;
    },
  };
}

test("resolveBaseUrlFromHeaders prefers forwarded host and protocol", () => {
  const value = resolveBaseUrlFromHeaders(
    createHeaders({
      "x-forwarded-host": "creator.example.com",
      "x-forwarded-proto": "https",
      host: "internal.local",
    })
  );

  assert.equal(value, "https://creator.example.com");
});

test("resolveBaseUrlFromHeaders falls back to localhost host header", () => {
  const value = resolveBaseUrlFromHeaders(
    createHeaders({
      host: "127.0.0.1:3001",
    })
  );

  assert.equal(value, "http://127.0.0.1:3001");
});

test("resolveBaseUrlFromRequestUrl returns the request origin", () => {
  assert.equal(
    resolveBaseUrlFromRequestUrl("https://creator.example.com/kazu"),
    "https://creator.example.com"
  );
});

test("withBaseUrl joins base urls and relative paths", () => {
  assert.equal(
    withBaseUrl("/icon/nagesen250.png", "https://creator.example.com/"),
    "https://creator.example.com/icon/nagesen250.png"
  );
  assert.equal(withBaseUrl("/kazu", ""), "/kazu");
});
