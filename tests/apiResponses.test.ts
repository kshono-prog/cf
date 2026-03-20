import assert from "node:assert/strict";
import test from "node:test";

import { errJson, okJson } from "@/lib/api/responses";

test("okJson keeps the shared ok envelope", async () => {
  const response = okJson({ value: 42 }, 201);
  const body = (await response.json()) as { ok: boolean; value: number };

  assert.equal(response.status, 201);
  assert.deepEqual(body, { ok: true, value: 42 });
});

test("errJson includes detail only when provided", async () => {
  const withDetail = errJson("TEST_ERROR", 422, "bad input");
  const withDetailBody = (await withDetail.json()) as {
    ok: boolean;
    error: string;
    detail?: string;
  };

  assert.equal(withDetail.status, 422);
  assert.deepEqual(withDetailBody, {
    ok: false,
    error: "TEST_ERROR",
    detail: "bad input",
  });

  const withoutDetail = errJson("TEST_ERROR", 400);
  const withoutDetailBody = (await withoutDetail.json()) as {
    ok: boolean;
    error: string;
    detail?: string;
  };

  assert.equal(withoutDetail.status, 400);
  assert.deepEqual(withoutDetailBody, {
    ok: false,
    error: "TEST_ERROR",
  });
});
