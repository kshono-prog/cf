import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const chainId = Number(process.env.CHAIN_ID ?? 137);
    const rpcUrl = mustEnv("POLYGON_RPC_URL");
    const jpycAddress = mustEnv("JPYC_ADDRESS");

    // Faucet config
    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    if (!config || !config.enabled) {
      return NextResponse.json({
        chainId,
        address: address.toLowerCase(),
        eligible: false,
        reasons: ["FAUCET_DISABLED"],
      });
    }

    // Faucet wallet (address only)
    const faucetWallet = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!faucetWallet) {
      return NextResponse.json({
        chainId,
        address: address.toLowerCase(),
        eligible: false,
        reasons: ["FAUCET_WALLET_NOT_CONFIGURED"],
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const jpyc = new ethers.Contract(jpycAddress, ERC20_ABI, provider);

    const [polBalWei, dec, jpycBalRaw] = await Promise.all([
      provider.getBalance(address),
      jpyc.decimals() as Promise<number>,
      jpyc.balanceOf(address) as Promise<bigint>,
    ]);

    // balances (string for UI)
    const polBalance = ethers.formatEther(polBalWei);
    const jpycBalance = ethers.formatUnits(jpycBalRaw, dec);

    // eligibility
    const minJpycRaw = BigInt(config.minJpyc) * 10n ** BigInt(dec);
    const hasMinJpyc = jpycBalRaw >= minJpycRaw;

    const requirePolZero = config.requirePolZero;
    const isPolZero = polBalWei === 0n;

    const alreadyClaimed = await prisma.gasClaim.findUnique({
      where: { address: address.toLowerCase() },
    });

    const faucetBalWei = await provider.getBalance(faucetWallet.address);
    const claimAmountWei = ethers.parseEther(config.claimAmountPol);
    const faucetSufficient = faucetBalWei >= claimAmountWei;

    const reasons: string[] = [];
    if (!hasMinJpyc) reasons.push("JPYC_BALANCE_LT_MIN");
    if (requirePolZero && !isPolZero) reasons.push("POL_BALANCE_NOT_ZERO");
    if (alreadyClaimed) reasons.push("ALREADY_CLAIMED");
    if (!faucetSufficient) reasons.push("FAUCET_INSUFFICIENT");

    return NextResponse.json({
      chainId,
      address: address.toLowerCase(),
      eligible: reasons.length === 0,
      reasons,
      minJpyc: config.minJpyc,
      jpycBalance,
      polBalance,
      claimableAmountPol: config.claimAmountPol,
      faucetAddress: faucetWallet.address,
      faucetBalancePol: ethers.formatEther(faucetBalWei),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
