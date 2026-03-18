// lib/api/gas.ts
// Gas support API calls. No apiBase parameter.
import type { Address } from "viem";
import type { GasEligibility } from "@/lib/mypage/types";
import {
  fetchGasEligibility as _fg,
  fetchGasNonce as _fn,
  claimGasSupport as _cg,
} from "@/lib/mypage/api";

export async function fetchGasEligibility(args: {
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; data: GasEligibility } | { ok: false; error: string }> {
  return _fg({ apiBase: "", ...args });
}

export async function fetchGasNonce(args: {
  address: Address;
  chainId?: number;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  return _fn({ apiBase: "", ...args });
}

export async function claimGasSupport(args: {
  address: Address;
  message: string;
  signature: string;
  chainId?: number;
}): Promise<{ ok: true; txHash: string | null } | { ok: false; error: string }> {
  return _cg({ apiBase: "", ...args });
}
