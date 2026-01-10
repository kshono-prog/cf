import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const chainIdRaw = searchParams.get("chainId");
    const chainId = Number(chainIdRaw ?? process.env.CHAIN_ID ?? 137);
    if (!Number.isFinite(chainId)) {
      return NextResponse.json({ error: "INVALID_CHAIN_ID" }, { status: 400 });
    }

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "FAUCET_DISABLED" }, { status: 403 });
    }

    const lower = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + config.nonceTtlMinutes * 60_000);

    await prisma.gasSupportNonce.upsert({
      where: { chainId_address: { chainId, address: lower } },
      update: { nonce, expiresAt },
      create: { chainId, address: lower, nonce, expiresAt },
    });

    const message = `creator funding gas support claim (chainId:${chainId}): ${nonce}`;

    return NextResponse.json({
      address: lower,
      message,
      nonce,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
