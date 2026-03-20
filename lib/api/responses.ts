// lib/api/responses.ts
import { NextResponse } from "next/server";

export type RouteJsonPayload<T> = {
  body: T;
  status: number;
};

export type ErrJsonPayload = {
  ok: false;
  error: string;
  detail?: string;
};

export function jsonResponse<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

export function routeJson<T>(response: RouteJsonPayload<T>): NextResponse<T> {
  return jsonResponse(response.body, response.status);
}

export function okJson<T extends Record<string, unknown>>(
  data: T,
  status = 200
): NextResponse<{ ok: true } & T> {
  return jsonResponse({ ok: true as const, ...data }, status);
}

export function errJson(
  code: string,
  status: number,
  detail?: string
): NextResponse<ErrJsonPayload> {
  const body: ErrJsonPayload = detail
    ? { ok: false, error: code, detail }
    : { ok: false, error: code };
  return jsonResponse(body, status);
}
