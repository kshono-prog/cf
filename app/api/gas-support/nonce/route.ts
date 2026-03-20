import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import crypto from "crypto";
import { getGasSupportEnv } from "@/lib/env";
import { errJson, jsonResponse } from "@/lib/api/responses";

const gasSupportEnv = getGasSupportEnv();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    if (!ethers.isAddress(address)) {
      return errJson("Invalid address", 400);
    }

    const chainIdRaw = searchParams.get("chainId");
    const chainId = Number(chainIdRaw ?? gasSupportEnv.defaultChainId);
    if (!Number.isFinite(chainId)) {
      return errJson("INVALID_CHAIN_ID", 400);
    }

    const config = await prisma.faucetConfig.findUnique({ where: { chainId } });
    if (!config || !config.enabled) {
      return errJson("FAUCET_DISABLED", 403);
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

    return jsonResponse({
      address: lower,
      message,
      nonce,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return errJson("INTERNAL_ERROR", 500);
  }
}
