import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrl } from "@/app/api/_lib/chain";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(_req: NextRequest) {
  try {
    const chainId = Number(process.env.CHAIN_ID ?? 137);
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json({ error: "UNSUPPORTED_CHAIN" }, { status: 400 });
    }
    const rpcUrl = getRpcUrl(chainId) ?? mustEnv("POLYGON_RPC_URL");

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    const faucetWallet = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!config || !faucetWallet) {
      return NextResponse.json({ chainId, enabled: false });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
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
