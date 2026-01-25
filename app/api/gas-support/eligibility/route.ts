import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrl, getTokenAddress } from "@/app/api/_lib/chain";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const jpycDecimalsCache = new Map<string, number>();

function pickChainId(raw: string | null): number {
  if (!raw) return Number(process.env.CHAIN_ID ?? 137);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number(process.env.CHAIN_ID ?? 137);
}

function getJpycAddress(chainId: number): string {
  if (chainId === 137) {
    return process.env.JPYC_ADDRESS || getTokenAddress(chainId, "JPYC") || "";
  }
  return getTokenAddress(chainId, "JPYC") || "";
}

async function getJpycDecimals(
  jpyc: ethers.Contract,
  cacheKey: string
): Promise<number> {
  const cached = jpycDecimalsCache.get(cacheKey);
  if (typeof cached === "number") return cached;
  const decimals = Number(await jpyc.decimals());
  jpycDecimalsCache.set(cacheKey, decimals);
  return decimals;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const chainId = pickChainId(searchParams.get("chainId"));
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json({ error: "UNSUPPORTED_CHAIN" }, { status: 400 });
    }

    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      return NextResponse.json(
        { error: "RPC_URL_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const jpycAddress = getJpycAddress(chainId);
    if (!jpycAddress) {
      return NextResponse.json(
        { error: "JPYC_ADDRESS_NOT_CONFIGURED" },
        { status: 500 }
      );
    }
    if (!ethers.isAddress(jpycAddress)) {
      return NextResponse.json(
        { error: "JPYC_ADDRESS_INVALID" },
        { status: 500 }
      );
    }

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
    if (!ethers.isAddress(faucetWallet.address)) {
      return NextResponse.json({
        chainId,
        address: address.toLowerCase(),
        eligible: false,
        reasons: ["FAUCET_ADDRESS_INVALID"],
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const jpyc = new ethers.Contract(jpycAddress, ERC20_ABI, provider);
    const cacheKey = `${chainId}:${jpycAddress.toLowerCase()}`;
    const decimalsPromise = getJpycDecimals(jpyc, cacheKey);
    const faucetBalancePromise = provider.getBalance(faucetWallet.address);

    let polBalWei: bigint;
    let dec: number;
    let jpycBalRaw: bigint;
    let faucetBalWei: bigint;
    try {
      [polBalWei, dec, jpycBalRaw, faucetBalWei] = await Promise.all([
        provider.getBalance(address),
        decimalsPromise,
        jpyc.balanceOf(address) as Promise<bigint>,
        faucetBalancePromise,
      ]);
    } catch (error) {
      console.error("RPC_CALL_FAILED", error);
      return NextResponse.json({
        chainId,
        address: address.toLowerCase(),
        eligible: false,
        reasons: ["RPC_CALL_FAILED"],
        minJpyc: config.minJpyc,
        jpycBalance: "0",
        nativeBalance: "0",
        claimableAmount: config.claimAmountPol,
        faucetAddress: faucetWallet.address,
        faucetBalance: "0",
        nativeSymbol: chainConfig.nativeSymbol,
      });
    }

    // balances (string for UI)
    const nativeBalance = ethers.formatEther(polBalWei);
    const jpycBalance = ethers.formatUnits(jpycBalRaw, dec);

    // eligibility
    const minJpycRaw = BigInt(config.minJpyc) * 10n ** BigInt(dec);
    const hasMinJpyc = jpycBalRaw >= minJpycRaw;

    const requirePolZero = config.requirePolZero;
    const isNativeZero = polBalWei === 0n;

    const alreadyClaimed = await prisma.gasClaim.findUnique({
      where: { chainId_address: { chainId, address: address.toLowerCase() } },
    });

    const claimAmountWei = ethers.parseEther(config.claimAmountPol);
    const faucetSufficient = faucetBalWei >= claimAmountWei;

    const reasons: string[] = [];
    if (!hasMinJpyc) reasons.push("JPYC_BALANCE_LT_MIN");
    if (requirePolZero && !isNativeZero) {
      reasons.push("NATIVE_BALANCE_NOT_ZERO");
    }
    if (alreadyClaimed) reasons.push("ALREADY_CLAIMED");
    if (!faucetSufficient) reasons.push("FAUCET_INSUFFICIENT");

    return NextResponse.json({
      chainId,
      address: address.toLowerCase(),
      eligible: reasons.length === 0,
      reasons,
      minJpyc: config.minJpyc,
      jpycBalance,
      nativeBalance,
      claimableAmount: config.claimAmountPol,
      faucetAddress: faucetWallet.address,
      faucetBalance: ethers.formatEther(faucetBalWei),
      nativeSymbol: chainConfig.nativeSymbol,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
