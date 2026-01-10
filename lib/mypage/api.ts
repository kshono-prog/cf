// /lib/mypage/api.ts
import type { Address } from "viem";
import type { GasEligibility, MeStatus } from "../../lib/mypage/types";
import {
  getErrorFromApiJson,
  getProjectIdFromApiJson,
  isRecord,
} from "../../lib/mypage/helpers";

/**
 * wagmi/viem の Address (`0x${string}`) をそのまま受け取る
 * - 呼び出し元で undefined を排除すればOK
 * - 以後「文字列だけどアドレスじゃない」を混入させない
 */

export async function fetchMe(args: {
  apiBase: string;
  address: Address;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const res = await fetch(`${args.apiBase}/api/me?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  // MeStatus の shape を厳密に検証したいなら型ガードを追加可能
  return { ok: true, data: data as MeStatus };
}

export async function fetchGasEligibility(args: {
  apiBase: string;
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; data: GasEligibility } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
  });
  if (typeof args.chainId === "number") {
    params.set("chainId", String(args.chainId));
  }
  const res = await fetch(
    `${args.apiBase}/api/gas-support/eligibility?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  return { ok: true, data: data as GasEligibility };
}

export async function fetchGasNonce(args: {
  apiBase: string;
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
  });
  if (typeof args.chainId === "number") {
    params.set("chainId", String(args.chainId));
  }
  const res = await fetch(
    `${args.apiBase}/api/gas-support/nonce?${params.toString()}`,
    { cache: "no-store" }
  );
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "NONCE_ERROR";
    return { ok: false, error: msg };
  }
  if (!isRecord(json) || typeof json.message !== "string") {
    return { ok: false, error: "NONCE_RESPONSE_INVALID" };
  }
  return { ok: true, message: json.message };
}

export async function claimGasSupport(args: {
  apiBase: string;
  address: Address;
  message: string;
  signature: string;
  chainId?: number;
}): Promise<
  { ok: true; txHash: string | null } | { ok: false; error: string }
> {
  const res = await fetch(`${args.apiBase}/api/gas-support/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: args.address,
      message: args.message,
      signature: args.signature,
      chainId: args.chainId,
    }),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "CLAIM_ERROR";
    return { ok: false, error: msg };
  }

  const txHash =
    isRecord(json) && typeof json.txHash === "string" ? json.txHash : null;

  return { ok: true, txHash };
}

/* =========================
   createProject: okなし {id} も許容
   - HTTP 200 で { id: "..." } の場合も成功扱い
   - { ok:true, id } / { ok:true, ... } も拾う
   - ただし { ok:false } 明示なら失敗扱い（保守）
========================= */

function pickProjectIdFromAnyShape(json: unknown): string | null {
  // 既存の helper（おそらく {id} や { ok:true, id } などを想定）
  const fromHelper = getProjectIdFromApiJson(json);
  if (typeof fromHelper === "string" && fromHelper.trim()) return fromHelper;

  // 追加：okなし { id } を確実に拾う
  if (!isRecord(json)) return null;

  const direct = json.id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // 追加：{ data: { id } } を念のため拾う
  const data = json.data;
  if (isRecord(data)) {
    const did = data.id;
    if (typeof did === "string" && did.trim()) return did.trim();
  }

  return null;
}

export async function createProject(args: {
  apiBase: string;
  payload: {
    title: string;
    description: string | null;
    purposeMode: string;
    ownerAddress: Address;
    address: Address; // API が address 必須でも通す保険、同じ値を入れる想定
  };
}): Promise<
  | { ok: true; id: string | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const res = await fetch(`${args.apiBase}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args.payload),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const apiError = getErrorFromApiJson(json);
    return {
      ok: false,
      error: apiError ?? "PROJECT_CREATE_FAILED",
      httpStatus: res.status,
    };
  }

  // ✅ 成功時の “ok:false” 明示は例外的に失敗扱いにしておく（サーバがそう返す場合に備える）
  if (isRecord(json) && json.ok === false) {
    const apiError = getErrorFromApiJson(json);
    return {
      ok: false,
      error: apiError ?? "PROJECT_CREATE_FAILED",
      httpStatus: res.status,
    };
  }

  // ✅ okなし {id} / okあり / helper経由、すべて拾う
  return { ok: true, id: pickProjectIdFromAnyShape(json) };
}
