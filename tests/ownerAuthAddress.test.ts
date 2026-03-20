import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOwnerAddressOrNull,
  parseOwnerAddressFromBody,
  parseOwnerAddressFromRecord,
  parseOwnerAddressFromSearchParams,
} from "@/lib/ownerAuthAddress";

test("normalizeOwnerAddressOrNull lowercases valid addresses", () => {
  assert.equal(
    normalizeOwnerAddressOrNull("0x1111111111111111111111111111111111111111"),
    "0x1111111111111111111111111111111111111111"
  );
});

test("normalizeOwnerAddressOrNull rejects invalid addresses", () => {
  assert.equal(normalizeOwnerAddressOrNull("not-an-address"), null);
});

test("parseOwnerAddressFromBody reads the default address key", () => {
  assert.equal(
    parseOwnerAddressFromBody({
      address: "0x1111111111111111111111111111111111111111",
    }),
    "0x1111111111111111111111111111111111111111"
  );
});

test("parseOwnerAddressFromRecord respects key precedence", () => {
  assert.equal(
    parseOwnerAddressFromRecord(
      {
        ownerAddress: "0x1111111111111111111111111111111111111111",
        address: "0x2222222222222222222222222222222222222222",
      },
      ["ownerAddress", "address"]
    ),
    "0x1111111111111111111111111111111111111111"
  );
});

test("parseOwnerAddressFromSearchParams reads the address query", () => {
  const searchParams = new URLSearchParams({
    address: "0x3333333333333333333333333333333333333333",
  });

  assert.equal(
    parseOwnerAddressFromSearchParams(searchParams),
    "0x3333333333333333333333333333333333333333"
  );
});
