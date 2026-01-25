import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrls, getTokenAddress } from "@/app/api/_lib/chain";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const jpycDecimalsCache = new Map<string, number>();
const RATE_LIMIT_PATTERNS = [/rate limit/i, /too many requests/i];

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message || "");
  if (RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message))) return true;
  const nestedMessage = String(
    (error as { error?: { message?: string } }).error?.message || ""
  );
  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(nestedMessage));
}

async function retryRpcCall<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === attempts - 1) {
        throw error;
      }
      const delayMs = 400 + attempt * 400 + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

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

function buildProvider(rpcUrls: string[]): ethers.AbstractProvider {
  if (rpcUrls.length === 1) {
    return new ethers.JsonRpcProvider(rpcUrls[0]);
  }
  const providers = rpcUrls.map((url) => new ethers.JsonRpcProvider(url));
  return new ethers.FallbackProvider(providers);
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

    const rpcUrls = getRpcUrls(chainId);
    if (rpcUrls.length === 0) {
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

    const provider = buildProvider(rpcUrls);
    const jpyc = new ethers.Contract(jpycAddress, ERC20_ABI, provider);
    const cacheKey = `${chainId}:${jpycAddress.toLowerCase()}`;
    const decimalsPromise = retryRpcCall(() => getJpycDecimals(jpyc, cacheKey));
    const faucetBalancePromise = retryRpcCall(() =>
      provider.getBalance(faucetWallet.address)
    );

    let polBalWei: bigint;
    let dec: number;
    let jpycBalRaw: bigint;
    let faucetBalWei: bigint;
    try {
      [polBalWei, dec, jpycBalRaw, faucetBalWei] = await Promise.all([
        retryRpcCall(() => provider.getBalance(address)),
        decimalsPromise,
        retryRpcCall(() => jpyc.balanceOf(address) as Promise<bigint>),
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
