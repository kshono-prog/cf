import type { SupportedChainId } from "@/lib/chainConfig";
import { getPublicEnv } from "@/lib/publicEnv";

const publicEnv = getPublicEnv();

export function getClientRpcUrl(chainId: SupportedChainId): string | null {
  if (chainId === 1) {
    return publicEnv.rpcUrlEthereum;
  }
  if (chainId === 137) {
    return publicEnv.rpcUrlPolygon ?? "https://polygon-bor-rpc.publicnode.com";
  }
  if (chainId === 43114) {
    return publicEnv.rpcUrlAvalanche;
  }
  return null;
}
