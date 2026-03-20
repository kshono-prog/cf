import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server";

import {
  buildCorsHeaders,
  optionsPreflight,
  resolveCorsOrigin,
  withCorsResponse,
  withCorsJson,
} from "@/app/api/_lib/cors";
import type { CorsEnv } from "@/lib/env";

const corsEnv: CorsEnv = {
  allowedOrigins: ["https://creator.example.com", "http://127.0.0.1:3001"],
};

test("resolveCorsOrigin returns the normalized allowed origin", () => {
  assert.equal(
    resolveCorsOrigin("https://creator.example.com/path", corsEnv),
    "https://creator.example.com"
  );
  assert.equal(resolveCorsOrigin("https://evil.example.com", corsEnv), null);
});

test("buildCorsHeaders only emits allow-origin for approved origins", () => {
  const allowed = buildCorsHeaders("http://127.0.0.1:3001", corsEnv);
  assert.equal(
    allowed.get("Access-Control-Allow-Origin"),
    "http://127.0.0.1:3001"
  );
  assert.equal(allowed.get("Access-Control-Allow-Methods"), "GET,POST,OPTIONS");
  assert.equal(allowed.get("Vary"), "Origin");

  const denied = buildCorsHeaders("https://evil.example.com", corsEnv);
  assert.equal(denied.get("Access-Control-Allow-Origin"), null);
  assert.equal(denied.get("Vary"), "Origin");
});

test("withCorsJson keeps the payload and mirrors only allowed origins", async () => {
  const response = withCorsJson(
    "https://creator.example.com",
    { ok: true },
    { status: 202 },
    corsEnv
  );

  assert.equal(response.status, 202);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://creator.example.com"
  );
  assert.deepEqual((await response.json()) as { ok: boolean }, { ok: true });
});

test("withCorsResponse appends allow-origin headers to an existing response", async () => {
  const response = withCorsResponse(
    "https://creator.example.com",
    NextResponse.json({ ok: true }, { status: 201 }),
    corsEnv
  );

  assert.equal(response.status, 201);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://creator.example.com"
  );
  assert.equal(response.headers.get("Vary"), "Origin");
  assert.deepEqual((await response.json()) as { ok: boolean }, { ok: true });
});

test("optionsPreflight can narrow allowed methods for read-only public routes", () => {
  const response = optionsPreflight(
    "https://creator.example.com",
    corsEnv,
    "GET,OPTIONS"
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET,OPTIONS");
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://creator.example.com"
  );
});

test("optionsPreflight returns 403 for disallowed origins", () => {
  const denied = optionsPreflight("https://evil.example.com", corsEnv);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);

  const allowed = optionsPreflight("http://127.0.0.1:3001", corsEnv);
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get("Access-Control-Allow-Origin"),
    "http://127.0.0.1:3001"
  );
});
