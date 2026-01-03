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

type Body = {
  address?: string;
  message?: string;
  signature?: string;
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

    // 1) nonce row
    const nonceRow = await prisma.gasSupportNonce.findUnique({
      where: { address },
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

    const chainId = Number(process.env.CHAIN_ID ?? 137);
    const rpcUrl = mustEnv("POLYGON_RPC_URL");
    const jpycAddress = mustEnv("JPYC_ADDRESS");

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

    // 3) eligibility re-check (server-side)
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const jpyc = new ethers.Contract(jpycAddress, ERC20_ABI, provider);

    const [polBalWei, dec, jpycBalRaw] = await Promise.all([
      provider.getBalance(address),
      jpyc.decimals() as Promise<number>,
      jpyc.balanceOf(address) as Promise<bigint>,
    ]);

    const minJpycRaw = BigInt(config.minJpyc) * 10n ** BigInt(dec);
    const hasMinJpyc = jpycBalRaw >= minJpycRaw;
    const isPolZero = polBalWei === 0n;

    if (!hasMinJpyc) {
      return NextResponse.json(
        { error: "JPYC_BALANCE_LT_MIN" },
        { status: 403 }
      );
    }
    if (config.requirePolZero && !isPolZero) {
      return NextResponse.json(
        { error: "POL_BALANCE_NOT_ZERO" },
        { status: 403 }
      );
    }

    // 4) already claimed?
    const existing = await prisma.gasClaim.findUnique({ where: { address } });
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

    // 7) send POL from faucet
    const faucetPk = mustEnv("FAUCET_PRIVATE_KEY");
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
      .delete({ where: { address } })
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
