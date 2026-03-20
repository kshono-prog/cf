// app/api/_lib/cors.ts
import { NextResponse } from "next/server";
import { getCorsEnv, type CorsEnv } from "@/lib/env";

export const corsAllowMethods = "GET,POST,OPTIONS";
export const corsReadOnlyMethods = "GET,OPTIONS";
export const corsAllowHeaders = "Content-Type, Authorization";

type CorsSource = { headers: Headers } | Headers | string | null | undefined;

function readRequestOrigin(source: CorsSource): string | null {
  if (typeof source === "string") return source;
  if (!source) return null;
  if (source instanceof Headers) return source.get("origin");
  return source.headers.get("origin");
}

function appendVary(headers: Headers, value: string) {
  const current = headers.get("Vary");
  if (!current) {
    headers.set("Vary", value);
    return;
  }
  const values = current
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (!values.includes(value)) {
    values.push(value);
    headers.set("Vary", values.join(", "));
  }
}

export function resolveCorsOrigin(
  source: CorsSource,
  env: CorsEnv = getCorsEnv()
): string | null {
  const requestOrigin = readRequestOrigin(source);
  if (!requestOrigin) return null;

  try {
    const normalized = new URL(requestOrigin).origin;
    return env.allowedOrigins.includes(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function buildCorsHeaders(
  source: CorsSource,
  env: CorsEnv = getCorsEnv(),
  init?: HeadersInit,
  methods: string = corsAllowMethods
): Headers {
  const headers = new Headers(init);
  headers.set("Access-Control-Allow-Methods", methods);
  headers.set("Access-Control-Allow-Headers", corsAllowHeaders);
  appendVary(headers, "Origin");

  const allowedOrigin = resolveCorsOrigin(source, env);
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return headers;
}

export function withCorsJson(
  source: CorsSource,
  data: unknown,
  init?: ResponseInit,
  env?: CorsEnv,
  methods?: string
) {
  return NextResponse.json(data, {
    ...init,
    headers: buildCorsHeaders(source, env, init?.headers, methods),
  });
}

export function withCorsResponse<T extends NextResponse>(
  source: CorsSource,
  response: T,
  env?: CorsEnv,
  methods?: string
): T {
  const headers = buildCorsHeaders(source, env, response.headers, methods);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export function optionsPreflight(
  source: CorsSource,
  env?: CorsEnv,
  methods?: string
) {
  const headers = buildCorsHeaders(source, env, undefined, methods);
  if (readRequestOrigin(source) && !headers.get("Access-Control-Allow-Origin")) {
    return new NextResponse(null, {
      status: 403,
      headers,
    });
  }
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}
