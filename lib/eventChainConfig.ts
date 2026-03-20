// lib/eventChainConfig.ts
import { getEventRpcEnv, getRequiredServerPrivateKey } from "@/lib/env";

export type SupportedEventChainId = 137 | 80002 | 43114;

export function isSupportedEventChainId(v: number): v is SupportedEventChainId {
  return v === 137 || v === 80002 || v === 43114;
}

export function getEventRpcUrl(chainId: SupportedEventChainId): string {
  const eventRpcEnv = getEventRpcEnv();
  if (chainId === 137) {
    return eventRpcEnv.eventRpcPolygon;
  }
  if (chainId === 80002) {
    const url = eventRpcEnv.eventRpcPolygonAmoy;
    if (!url) throw new Error("MISSING_EVENT_RPC_POLYGON_AMOY");
    return url;
  }
  if (chainId === 43114) {
    return eventRpcEnv.eventRpcAvax;
  }
  throw new Error("UNREACHABLE_EVENT_CHAIN");
}

export function getEventOperatorPrivateKey(): string {
  return getRequiredServerPrivateKey("EVENT_OPERATOR_PRIVATE_KEY");
}
