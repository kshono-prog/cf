"use client";

import type { GrowthEventPayload } from "@/lib/growth/types";

type GrowthEventPostResponse =
  | { ok: true }
  | { ok: false; error: string };

function buildGrowthEventBody(payload: GrowthEventPayload): string {
  return JSON.stringify(payload);
}

export async function postGrowthEvent(
  payload: GrowthEventPayload
): Promise<GrowthEventPostResponse> {
  try {
    const response = await fetch("/api/growth/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: buildGrowthEventBody(payload),
      keepalive: true,
    });
    const json: unknown = await response.json().catch(() => null);

    if (
      !json ||
      typeof json !== "object" ||
      !("ok" in json) ||
      typeof json.ok !== "boolean"
    ) {
      return { ok: false, error: "GROWTH_EVENT_RESPONSE_INVALID" };
    }

    if (json.ok !== true) {
      return {
        ok: false,
        error:
          "error" in json && typeof json.error === "string"
            ? json.error
            : "GROWTH_EVENT_POST_FAILED",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "GROWTH_EVENT_POST_FAILED" };
  }
}

export function trackGrowthEvent(payload: GrowthEventPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const body = buildGrowthEventBody(payload);

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const sent = navigator.sendBeacon(
        "/api/growth/events",
        new Blob([body], { type: "application/json" })
      );

      if (sent) {
        return;
      }
    }

    void fetch("/api/growth/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Growth events must never block the UI.
  }
}
