// lib/reverifyClient.ts
"use client";

export type ReverifyResponse =
  | {
      ok: true;
      verified: true;
      contribution: { txHash: `0x${string}`; status: string };
    }
  | {
      ok: true;
      verified: false;
      reason?: string;
      contribution?: { txHash: `0x${string}`; status: string };
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toBool(v: unknown): boolean {
  return v === true;
}
function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function isHexTxHash(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v);
}
function toTxHash(v: unknown): `0x${string}` | null {
  return isHexTxHash(v) ? (v as `0x${string}`) : null;
}

export async function postReverify(
  txHash: `0x${string}`
): Promise<ReverifyResponse> {
  const res = await fetch("/api/contributions/reverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txHash }),
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = isRecord(json) ? toString(json.error) : null;
    return { ok: true, verified: false, reason: err ?? "HTTP_ERROR" };
  }

  if (!isRecord(json))
    return { ok: true, verified: false, reason: "INVALID_RESPONSE" };

  const ok = toBool(json.ok);
  const verified = toBool(json.verified);
  if (!ok) {
    return {
      ok: true,
      verified: false,
      reason: toString(json.error) ?? "NOT_OK",
    };
  }

  if (verified) {
    const c = isRecord(json.contribution) ? json.contribution : null;
    const h = c ? toTxHash(c.txHash) : null;
    const st = c ? toString(c.status) : null;
    return h && st
      ? { ok: true, verified: true, contribution: { txHash: h, status: st } }
      : {
          ok: true,
          verified: true,
          contribution: { txHash, status: "CONFIRMED" },
        };
  }

  return {
    ok: true,
    verified: false,
    reason: toString(json.reason) ?? undefined,
  };
}

/* =========================
 * NEW: auto reverify helpers
 * ========================= */

export type PendingContribution = {
  txHash: `0x${string}`;
  status: "PENDING";
  updatedAt?: string | null;
};

export type PendingContributionsResponse =
  | { ok: true; contributions: PendingContribution[] }
  | { ok: true; contributions: [] }
  | { ok: false; reason: string };

function toPendingContribution(v: unknown): PendingContribution | null {
  if (!isRecord(v)) return null;
  const txHash = toTxHash(v.txHash);
  const status = toString(v.status);
  if (!txHash) return null;
  if (status !== "PENDING") return null;

  const updatedAtRaw = isRecord(v) ? v.updatedAt : null;
  const updatedAt = toString(updatedAtRaw);
  return { txHash, status: "PENDING", updatedAt };
}

export async function fetchPendingContributions(params: {
  projectId: string;
}): Promise<PendingContributionsResponse> {
  const url = `/api/projects/${encodeURIComponent(
    params.projectId
  )}/contributions?status=PENDING`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = isRecord(json) ? toString(json.error) : null;
    return { ok: false, reason: err ?? `HTTP_${res.status}` };
  }

  if (!isRecord(json)) return { ok: false, reason: "INVALID_RESPONSE" };
  if (json.ok !== true) {
    return { ok: false, reason: toString(json.error) ?? "NOT_OK" };
  }

  const arr = Array.isArray(json.contributions) ? json.contributions : [];
  const out: PendingContribution[] = [];
  for (const x of arr) {
    const p = toPendingContribution(x);
    if (p) out.push(p);
  }
  return { ok: true, contributions: out };
}

/**
 * 自動 reverify（表示時向け）
 * - Guard A: cooldown（同じ txHash を短時間に叩かない）
 * - Guard B: 1回あたり最大件数
 * - Guard C: 呼び元で “同時実行禁止” する前提（ここでは状態を持たない）
 */
const REVERIFY_GUARD_KEY = "cf:reverify_guard:v1";

type GuardMap = Record<string, number>; // txHash -> lastAttemptMs

function loadGuardMap(): GuardMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(REVERIFY_GUARD_KEY);
    if (!raw) return {};
    const json = JSON.parse(raw) as unknown;
    if (!isRecord(json)) return {};
    const out: GuardMap = {};
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveGuardMap(map: GuardMap): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REVERIFY_GUARD_KEY, JSON.stringify(map));
}

export type AutoReverifyResult = {
  ok: true;
  tried: `0x${string}`[];
  verified: `0x${string}`[];
  skippedByCooldown: `0x${string}`[];
  skippedNoPending: boolean;
};

export async function autoReverifyPending(params: {
  projectId: string;
  cooldownMs?: number; // default 60s
  maxPerView?: number; // default 3
}): Promise<AutoReverifyResult> {
  const cooldownMs =
    typeof params.cooldownMs === "number" && Number.isFinite(params.cooldownMs)
      ? Math.max(0, Math.floor(params.cooldownMs))
      : 60_000;

  const maxPerView =
    typeof params.maxPerView === "number" && Number.isFinite(params.maxPerView)
      ? Math.max(1, Math.floor(params.maxPerView))
      : 3;

  const pendingRes = await fetchPendingContributions({
    projectId: params.projectId,
  });

  if (!pendingRes.ok || pendingRes.contributions.length === 0) {
    return {
      ok: true,
      tried: [],
      verified: [],
      skippedByCooldown: [],
      skippedNoPending: true,
    };
  }

  const now = Date.now();
  const guard = loadGuardMap();

  const skippedByCooldown: `0x${string}`[] = [];
  const candidates: `0x${string}`[] = [];

  for (const c of pendingRes.contributions) {
    const last = guard[c.txHash] ?? 0;
    if (now - last <= cooldownMs) {
      skippedByCooldown.push(c.txHash);
    } else {
      candidates.push(c.txHash);
    }
  }

  const targets = candidates.slice(0, maxPerView);
  const tried: `0x${string}`[] = [];
  const verified: `0x${string}`[] = [];

  for (const txHash of targets) {
    tried.push(txHash);

    // 先にガード更新（連打/多重起動でも同一 txHash を叩きにくくする）
    guard[txHash] = now;
    saveGuardMap(guard);

    const r = await postReverify(txHash);
    if (r.ok && r.verified) verified.push(txHash);
  }

  return {
    ok: true,
    tried,
    verified,
    skippedByCooldown,
    skippedNoPending: false,
  };
}
