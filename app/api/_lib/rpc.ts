import { ethers } from "ethers";

const PROVIDER_OPTIONS = { batchMaxCount: 1 };

function createRpcProvider(
  chainId: number,
  url: string
): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(
    url,
    chainId,
    {
      ...PROVIDER_OPTIONS,
      staticNetwork: true,
    }
  );
}

export async function filterWorkingRpcUrls(
  chainId: number,
  rpcUrls: string[]
): Promise<string[]> {
  const ok: string[] = [];

  for (const url of rpcUrls) {
    try {
      const probeProvider = createRpcProvider(chainId, url);
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
    return createRpcProvider(chainId, rpcUrls[0]);
  }

  const providers = rpcUrls.map((url) => createRpcProvider(chainId, url));

  return new ethers.FallbackProvider(providers, 1);
}
