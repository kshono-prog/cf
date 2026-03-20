import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getGasSupportEnv } from "@/lib/env";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrls, getTokenAddress } from "@/app/api/_lib/chain";
import { buildProvider, filterWorkingRpcUrls } from "@/app/api/_lib/rpc";
import { errJson, okJson } from "@/lib/api/responses";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

type GasSupportEnv = ReturnType<typeof getGasSupportEnv>;

function getFaucetPrivateKey(env: GasSupportEnv, chainId: number): string {
  if (chainId === 43114) {
    return env.faucetPrivateKeyAvax ?? "";
  }
  return env.faucetPrivateKey;
}

function pickChainId(env: GasSupportEnv, raw?: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return env.defaultChainId;
  }
  return raw;
}

function getJpycAddress(env: GasSupportEnv, chainId: number): string {
  if (chainId === 137) {
    return env.jpycAddress || getTokenAddress(chainId, "JPYC") || "";
  }
  return getTokenAddress(chainId, "JPYC") || "";
}

type Body = {
  address?: string;
  message?: string;
  signature?: string;
  chainId?: number;
};

export async function POST(req: NextRequest) {
  const gasSupportEnv = getGasSupportEnv();
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return errJson("Invalid JSON", 400);
    }

    const address = (body.address || "").toLowerCase();
    const message = body.message || "";
    const signature = body.signature || "";

    if (!ethers.isAddress(address)) {
      return errJson("Invalid address", 400);
    }
    if (!message || !signature) {
      return errJson("Missing message/signature", 400);
    }

    const chainId = pickChainId(gasSupportEnv, body.chainId);
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return errJson("UNSUPPORTED_CHAIN", 400);
    }

    // 1) nonce row
    const nonceRow = await prisma.gasSupportNonce.findUnique({
      where: { chainId_address: { chainId, address } },
    });
    if (!nonceRow) {
      return errJson("NONCE_NOT_FOUND", 400);
    }
    if (nonceRow.expiresAt.getTime() < Date.now()) {
      return errJson("NONCE_EXPIRED", 400);
    }
    if (!message.includes(nonceRow.nonce)) {
      return errJson("NONCE_MISMATCH", 400);
    }

    // 2) signature verify
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== address) {
      return errJson("SIGNATURE_INVALID", 401);
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

    const jpycAddress = getJpycAddress(gasSupportEnv, chainId);
    if (!jpycAddress) {
      return errJson("JPYC_ADDRESS_NOT_CONFIGURED", 500);
    }

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    if (!config || !config.enabled) {
      return errJson("FAUCET_DISABLED", 403);
    }

    const faucetWalletRow = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!faucetWalletRow) {
      return errJson("FAUCET_WALLET_NOT_CONFIGURED", 500);
    }

    const faucetPk = getFaucetPrivateKey(gasSupportEnv, chainId);
    if (!faucetPk) {
      return errJson("FAUCET_PRIVATE_KEY_NOT_CONFIGURED", 500);
    }

    // 3) eligibility re-check (server-side)
    const provider = buildProvider(chainId, rpcUrls);
    const jpyc = new ethers.Contract(jpycAddress, ERC20_ABI, provider);

    const [polBalWei, dec, jpycBalRaw] = await Promise.all([
      provider.getBalance(address),
      jpyc.decimals() as Promise<number>,
      jpyc.balanceOf(address) as Promise<bigint>,
    ]);

    const minJpycRaw = BigInt(config.minJpyc) * 10n ** BigInt(dec);
    const hasMinJpyc = jpycBalRaw >= minJpycRaw;
    const isNativeZero = polBalWei === 0n;

    if (!hasMinJpyc) {
      return errJson("JPYC_BALANCE_LT_MIN", 403);
    }
    if (config.requirePolZero && !isNativeZero) {
      return errJson("NATIVE_BALANCE_NOT_ZERO", 403);
    }

    // 4) already claimed?
    const existing = await prisma.gasClaim.findUnique({
      where: { chainId_address: { chainId, address } },
    });
    if (existing) {
      return errJson("ALREADY_CLAIMED", 409);
    }

    // 5) faucet balance check
    const claimAmountWei = ethers.parseEther(config.claimAmountPol);
    const faucetBalWei = await provider.getBalance(faucetWalletRow.address);
    if (faucetBalWei < claimAmountWei) {
      return errJson("FAUCET_INSUFFICIENT", 503);
    }

    // 6) create claim record first (DB lock by unique(address))
    const claim = await prisma.gasClaim.create({
      data: {
        chainId,
        address,
        amountPol: config.claimAmountPol,
        status: "PENDING",
      },
    });

    // 7) send native token from faucet
    const faucetSigner = new ethers.Wallet(faucetPk, provider);

    // safety: signer address must match configured faucet address
    const signerAddr = (await faucetSigner.getAddress()).toLowerCase();
    if (signerAddr !== faucetWalletRow.address.toLowerCase()) {
      await prisma.gasClaim.update({
        where: { id: claim.id },
        data: { status: "FAILED", reason: "FAUCET_SIGNER_MISMATCH" },
      });
      return errJson("FAUCET_SIGNER_MISMATCH", 500);
    }

    const tx = await faucetSigner.sendTransaction({
      to: address,
      value: claimAmountWei,
    });

    // note: wait for inclusion is optional. Here: immediate "SUCCESS" as sent.
    await prisma.gasClaim.update({
      where: { id: claim.id },
      data: { txHash: tx.hash, status: "SUCCESS" },
    });

    // 8) consume nonce
    await prisma.gasSupportNonce
      .delete({ where: { chainId_address: { chainId, address } } })
      .catch(() => null);

    return okJson({
      chainId,
      address,
      amountPol: config.claimAmountPol,
      txHash: tx.hash,
    });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "CLAIM_ERROR";
    return errJson(message, 500);
  }
}
