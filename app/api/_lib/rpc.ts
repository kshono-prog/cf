import { ethers } from "ethers";

const PROVIDER_OPTIONS = { batchMaxCount: 1 };

export async function filterWorkingRpcUrls(
  chainId: number,
  rpcUrls: string[]
): Promise<string[]> {
  const ok: string[] = [];

  for (const url of rpcUrls) {
    try {
      const probeProvider = new ethers.JsonRpcProvider(url, "any");
      const net = await probeProvider.getNetwork();
      const detected = Number(net.chainId);

      if (detected !== chainId) {
        console.warn("[RPC_PROBE] chainId mismatch", {
          url,
          expected: chainId,
          detected,
        });
        continue;
      }

      ok.push(url);
    } catch (error) {
      console.warn("[RPC_PROBE] failed", { url, error });
    }
  }

  return ok;
}

export function buildProvider(
  chainId: number,
  rpcUrls: string[]
): ethers.AbstractProvider {
  if (rpcUrls.length === 0) {
    throw new Error("No RPC URLs provided");
  }
  if (rpcUrls.length === 1) {
    return new ethers.JsonRpcProvider(rpcUrls[0], chainId, PROVIDER_OPTIONS);
  }
  const providers = rpcUrls.map(
    (url) => new ethers.JsonRpcProvider(url, chainId, PROVIDER_OPTIONS)
  );
  return new ethers.FallbackProvider(providers, 1);
}
