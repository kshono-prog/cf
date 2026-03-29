import { Prisma } from "@prisma/client";

import {
  isRecord,
  toOptionalString,
} from "@/lib/api/guards";
import {
  GROWTH_EVENT_NAMES,
  type GrowthEventName,
  type GrowthEventPayload,
} from "@/lib/growth/types";

const GROWTH_EVENT_NAME_SET = new Set<string>(GROWTH_EVENT_NAMES);

type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson };

type ValidatedGrowthEventPayload = {
  event: GrowthEventName;
  username: string | null;
  walletAddress: string | null;
  projectId: string | null;
  metadata: Prisma.InputJsonValue;
};

function parseOptionalNullableString(
  value: unknown
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return toOptionalString(value) ?? null;
}

function sanitizeMetadataValue(
  value: unknown,
  depth = 0
): SerializableJson | undefined {
  if (depth > 8) {
    return "[depth-limited]";
  }

  if (value === null) return null;

  if (typeof value === "string") return value;

  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    return String(value);
  }

  if (typeof value === "boolean") return value;

  if (typeof value === "bigint") return value.toString();

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadataValue(item, depth + 1) ?? null);
  }

  if (isRecord(value)) {
    const nextObject: Record<string, SerializableJson> = {};

    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeMetadataValue(entry, depth + 1);
      if (sanitized !== undefined) {
        nextObject[key] = sanitized;
      }
    }

    return nextObject;
  }

  return undefined;
}

export function isGrowthEventName(value: unknown): value is GrowthEventName {
  return typeof value === "string" && GROWTH_EVENT_NAME_SET.has(value);
}

export function sanitizeGrowthMetadata(value: unknown): Prisma.InputJsonValue {
  const sanitized = sanitizeMetadataValue(value);

  if (sanitized === undefined || sanitized === null) {
    return {};
  }

  return sanitized as Prisma.InputJsonValue;
}

export function validateGrowthEventPayload(
  value: unknown
):
  | { ok: true; data: ValidatedGrowthEventPayload }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "INVALID_JSON" };
  }

  if (!isGrowthEventName(value.event)) {
    return { ok: false, error: "INVALID_EVENT_NAME" };
  }

  const username = parseOptionalNullableString(value.username);
  const walletAddress = parseOptionalNullableString(value.walletAddress);
  const projectId = parseOptionalNullableString(value.projectId);

  if (typeof username === "undefined") {
    return { ok: false, error: "USERNAME_INVALID" };
  }

  if (typeof walletAddress === "undefined") {
    return { ok: false, error: "WALLET_ADDRESS_INVALID" };
  }

  if (typeof projectId === "undefined") {
    return { ok: false, error: "PROJECT_ID_INVALID" };
  }

  return {
    ok: true,
    data: {
      event: value.event,
      username,
      walletAddress:
        walletAddress && walletAddress.trim().length > 0
          ? walletAddress.trim().toLowerCase()
          : null,
      projectId,
      metadata: sanitizeGrowthMetadata(value.metadata),
    },
  };
}

export type { ValidatedGrowthEventPayload, GrowthEventPayload };
