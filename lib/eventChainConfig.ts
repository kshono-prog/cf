// lib/eventChainConfig.ts
export type SupportedEventChainId = 137 | 80002 | 43114;

export function isSupportedEventChainId(v: number): v is SupportedEventChainId {
  return v === 137 || v === 80002 || v === 43114;
}

export function getEventRpcUrl(chainId: SupportedEventChainId): string {
  if (chainId === 137) {
    const url = process.env.EVENT_RPC_POLYGON;
    if (!url) throw new Error("MISSING_EVENT_RPC_POLYGON");
    return url;
  }
  if (chainId === 80002) {
    const url = process.env.EVENT_RPC_POLYGON_AMOY;
    if (!url) throw new Error("MISSING_EVENT_RPC_POLYGON_AMOY");
    return url;
  }
  if (chainId === 43114) {
    const url = process.env.EVENT_RPC_AVAX;
    if (!url) throw new Error("MISSING_EVENT_RPC_AVAX");
    return url;
  }
  throw new Error("UNREACHABLE_EVENT_CHAIN");
}

export function getEventOperatorPrivateKey(): string {
  const pk = process.env.EVENT_OPERATOR_PRIVATE_KEY;
  if (!pk) throw new Error("MISSING_EVENT_OPERATOR_PRIVATE_KEY");
  return pk;
}
