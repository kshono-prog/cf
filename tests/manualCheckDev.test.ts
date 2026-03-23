import assert from "node:assert/strict";
import test from "node:test";

import {
  isDevManualCheckEnabled,
  isLocalDevHost,
  resolveDevManualCheckAddress,
} from "@/lib/manualCheckDev";

test("manual check dev helpers accept local hosts and enabled flags", () => {
  assert.equal(isLocalDevHost("127.0.0.1:3001"), true);
  assert.equal(isLocalDevHost("localhost:3000"), true);
  assert.equal(isLocalDevHost("creator.example.com"), false);

  assert.equal(isDevManualCheckEnabled("1"), true);
  assert.equal(isDevManualCheckEnabled("true"), true);
  assert.equal(isDevManualCheckEnabled(["yes"]), true);
  assert.equal(isDevManualCheckEnabled("0"), false);
});

test("manual check dev helper normalizes only valid owner addresses", () => {
  assert.equal(
    resolveDevManualCheckAddress("0x1111111111111111111111111111111111111111"),
    "0x1111111111111111111111111111111111111111"
  );
  assert.equal(resolveDevManualCheckAddress("invalid"), null);
});
