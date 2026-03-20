import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getGasSupportEnv } from "@/lib/env";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrls } from "@/app/api/_lib/chain";
import { buildProvider, filterWorkingRpcUrls } from "@/app/api/_lib/rpc";
import { errJson, jsonResponse } from "@/lib/api/responses";

const gasSupportEnv = getGasSupportEnv();

export async function GET() {
  try {
    const chainId = gasSupportEnv.defaultChainId;
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return errJson("UNSUPPORTED_CHAIN", 400);
    }
    const rpcUrlsRaw = getRpcUrls(chainId);
    if (rpcUrlsRaw.length === 0) {
      return errJson("RPC_URL_NOT_CONFIGURED", 500);
    }
    const rpcUrls = await filterWorkingRpcUrls(chainId, rpcUrlsRaw);
    if (rpcUrls.length === 0) {
      console.error("[RPC] No valid RPC endpoints after probing", {
        chainId,
        rpcUrlsRaw,
      });
      return errJson("NO_VALID_RPC_ENDPOINT", 500);
    }

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    const faucetWallet = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!config || !faucetWallet) {
      return jsonResponse({ chainId, enabled: false });
    }

    const provider = buildProvider(chainId, rpcUrls);
    const balWei = await provider.getBalance(faucetWallet.address);

    return jsonResponse({
      chainId,
      enabled: config.enabled,
      faucetAddress: faucetWallet.address,
      faucetBalance: ethers.formatEther(balWei),
      claimableAmount: config.claimAmountPol,
      nativeSymbol: chainConfig.nativeSymbol,
    });
  } catch (e) {
    console.error(e);
    return errJson("INTERNAL_ERROR", 500);
  }
}
