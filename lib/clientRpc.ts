import type { SupportedChainId } from "@/lib/chainConfig";

function readEnv(name: string): string | null {
  const v = process.env[name];
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export function getClientRpcUrl(chainId: SupportedChainId): string | null {
  if (chainId === 1) {
    return (
      readEnv("NEXT_PUBLIC_RPC_URL_ETHEREUM") ??
      readEnv("NEXT_PUBLIC_ETHEREUM_RPC_URL") ??
      readEnv("ETHEREUM_RPC_URL")
    );
  }
  if (chainId === 137) {
    return (
      readEnv("NEXT_PUBLIC_RPC_URL_POLYGON") ??
      readEnv("NEXT_PUBLIC_POLYGON_RPC_URL") ??
      readEnv("POLYGON_RPC_URL")
    );
  }
  if (chainId === 43114) {
    return (
      readEnv("NEXT_PUBLIC_RPC_URL_AVAX") ??
      readEnv("NEXT_PUBLIC_AVALANCHE_RPC_URL") ??
      readEnv("AVALANCHE_RPC_URL")
    );
  }
  return null;
}

