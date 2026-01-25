import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrls } from "@/app/api/_lib/chain";
import { buildProvider, filterWorkingRpcUrls } from "@/app/api/_lib/rpc";

export async function GET(_req: NextRequest) {
  try {
    const chainId = Number(process.env.CHAIN_ID ?? 137);
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json({ error: "UNSUPPORTED_CHAIN" }, { status: 400 });
    }
    const rpcUrlsRaw = getRpcUrls(chainId);
    if (rpcUrlsRaw.length === 0) {
      return NextResponse.json(
        { error: "RPC_URL_NOT_CONFIGURED" },
        { status: 500 }
      );
    }
    const rpcUrls = await filterWorkingRpcUrls(chainId, rpcUrlsRaw);
    if (rpcUrls.length === 0) {
      console.error("[RPC] No valid RPC endpoints after probing", {
        chainId,
        rpcUrlsRaw,
      });
      return NextResponse.json(
        { error: "NO_VALID_RPC_ENDPOINT" },
        { status: 500 }
      );
    }

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    const faucetWallet = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!config || !faucetWallet) {
      return NextResponse.json({ chainId, enabled: false });
    }

    const provider = buildProvider(chainId, rpcUrls);
    const balWei = await provider.getBalance(faucetWallet.address);

    return NextResponse.json({
      chainId,
      enabled: config.enabled,
      faucetAddress: faucetWallet.address,
      faucetBalance: ethers.formatEther(balWei),
      claimableAmount: config.claimAmountPol,
      nativeSymbol: chainConfig.nativeSymbol,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
