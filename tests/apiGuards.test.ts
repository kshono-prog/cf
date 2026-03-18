import assert from "node:assert/strict";
import test from "node:test";

import {
  isJsonObjectOrArray,
  isRecord,
  lowerOrNull,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
  toNumberOrNull,
} from "../lib/api/guards";

test("toAddressOrNull returns checksum address for valid inputs", () => {
  assert.equal(
    toAddressOrNull("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  assert.equal(
    toAddressOrNull("  0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266  "),
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
});

test("toAddressOrNull rejects invalid values", () => {
  assert.equal(toAddressOrNull("not-an-address"), null);
  assert.equal(toAddressOrNull(null), null);
  assert.equal(toAddressOrNull(123), null);
});

test("toBigIntOrThrow parses integers and throws with the provided code", () => {
  assert.equal(toBigIntOrThrow("42", "BIGINT_INVALID"), 42n);
  assert.throws(
    () => toBigIntOrThrow("nope", "BIGINT_INVALID"),
    (error: unknown) =>
      error instanceof Error && error.message === "BIGINT_INVALID"
  );
});

test("basic guard helpers preserve strict shapes", () => {
  assert.equal(isRecord({ ok: true }), true);
  assert.equal(isRecord(null), false);

  assert.equal(toNonEmptyString(" hello "), "hello");
  assert.equal(toNonEmptyString("   "), null);

  assert.equal(lowerOrNull("AbC"), "abc");
  assert.equal(lowerOrNull(null), null);

  assert.equal(toNumberOrNull(12.5), 12.5);
  assert.equal(toNumberOrNull(Number.NaN), null);

  assert.equal(isJsonObjectOrArray({ ok: true }), true);
  assert.equal(isJsonObjectOrArray(["x"]), true);
  assert.equal(isJsonObjectOrArray("x"), false);
});
