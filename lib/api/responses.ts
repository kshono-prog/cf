// lib/api/responses.ts
import { NextResponse } from "next/server";

export function okJson<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json({ ok: true, ...data });
}

export function errJson(code: string, status: number) {
  return NextResponse.json({ ok: false, error: code }, { status });
}
