import type { Address } from "viem";

import type { GasEligibility } from "@/lib/mypage/types";
import { isRecord } from "@/lib/mypage/mypageApiShared";

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
