import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getChainConfig } from "@/lib/chainConfig";
import { getRpcUrls, getTokenAddress } from "@/app/api/_lib/chain";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function getFaucetPrivateKey(chainId: number): string {
  if (chainId === 43114) {
    return process.env.FAUCET_PRIVATE_KEY_AVAX || "";
  }
  return process.env.FAUCET_PRIVATE_KEY || "";
}

function pickChainId(raw?: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return Number(process.env.CHAIN_ID ?? 137);
  }
  return raw;
}

function getJpycAddress(chainId: number): string {
  if (chainId === 137) {
    return process.env.JPYC_ADDRESS || getTokenAddress(chainId, "JPYC") || "";
  }
  return getTokenAddress(chainId, "JPYC") || "";
}

function buildProvider(rpcUrls: string[]): ethers.AbstractProvider {
  const providerOptions = { batchMaxCount: 1 };
  if (rpcUrls.length === 1) {
    return new ethers.JsonRpcProvider(rpcUrls[0], undefined, providerOptions);
  }
  const providers = rpcUrls.map(
    (url) => new ethers.JsonRpcProvider(url, undefined, providerOptions)
  );
  return new ethers.FallbackProvider(providers, 1);
}

type Body = {
  address?: string;
  message?: string;
  signature?: string;
  chainId?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const address = (body.address || "").toLowerCase();
    const message = body.message || "";
    const signature = body.signature || "";

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message/signature" },
        { status: 400 }
      );
    }

    const chainId = pickChainId(body.chainId);
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json({ error: "UNSUPPORTED_CHAIN" }, { status: 400 });
    }

    // 1) nonce row
    const nonceRow = await prisma.gasSupportNonce.findUnique({
      where: { chainId_address: { chainId, address } },
    });
    if (!nonceRow) {
      return NextResponse.json({ error: "NONCE_NOT_FOUND" }, { status: 400 });
    }
    if (nonceRow.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "NONCE_EXPIRED" }, { status: 400 });
    }
    if (!message.includes(nonceRow.nonce)) {
      return NextResponse.json({ error: "NONCE_MISMATCH" }, { status: 400 });
    }

    // 2) signature verify
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== address) {
      return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 401 });
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

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "FAUCET_DISABLED" }, { status: 403 });
    }

    const faucetWalletRow = await prisma.faucetWallet.findFirst({
      where: { chainId, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!faucetWalletRow) {
      return NextResponse.json(
        { error: "FAUCET_WALLET_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const faucetPk = getFaucetPrivateKey(chainId);
    if (!faucetPk) {
      return NextResponse.json(
        { error: "FAUCET_PRIVATE_KEY_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    // 3) eligibility re-check (server-side)
    const provider = buildProvider(rpcUrls);
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
      return NextResponse.json(
        { error: "JPYC_BALANCE_LT_MIN" },
        { status: 403 }
      );
    }
    if (config.requirePolZero && !isNativeZero) {
      return NextResponse.json(
        { error: "NATIVE_BALANCE_NOT_ZERO" },
        { status: 403 }
      );
    }

    // 4) already claimed?
    const existing = await prisma.gasClaim.findUnique({
      where: { chainId_address: { chainId, address } },
    });
    if (existing) {
      return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 409 });
    }

    // 5) faucet balance check
    const claimAmountWei = ethers.parseEther(config.claimAmountPol);
    const faucetBalWei = await provider.getBalance(faucetWalletRow.address);
    if (faucetBalWei < claimAmountWei) {
      return NextResponse.json(
        { error: "FAUCET_INSUFFICIENT" },
        { status: 503 }
      );
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
      return NextResponse.json(
        { error: "FAUCET_SIGNER_MISMATCH" },
        { status: 500 }
      );
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

    return NextResponse.json({
      ok: true,
      chainId,
      address,
      amountPol: config.claimAmountPol,
      txHash: tx.hash,
    });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "CLAIM_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
