// app/api/_lib/cors.ts
import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // 必要に応じて限定: "https://nagesen-v2.vercel.app"
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCorsJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...corsHeaders,
    },
  });
}

export function optionsPreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
