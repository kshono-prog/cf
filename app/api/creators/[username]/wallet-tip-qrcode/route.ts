import { NextRequest, NextResponse } from "next/server";

import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import {
  getDefaultChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";
import {
  type ExternalWalletTipAssetKey,
  buildExternalWalletTipQrPayload,
  parseExternalWalletTipAsset,
  parseExternalWalletTipChainId,
} from "@/lib/externalWalletTipQr";
import { errJson } from "@/lib/api/responses";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { applyQrCodePngResponseHeaders, renderQrCodePng } from "@/lib/qrCodePng";

type CreatorWalletTipQrRouteContext = {
  params: Promise<{ username: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_EXTERNAL_TIP_CHAIN_ID: SupportedChainId = 137;

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(
  req: NextRequest,
  context: CreatorWalletTipQrRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;
  const creator = await getCreatorProfileByUsername(username);

  if (!creator) {
    return withCorsResponse(
      req,
      errJson("CREATOR_NOT_FOUND", 404),
      undefined,
      corsReadOnlyMethods
    );
  }

  if (!creator.creator.address) {
    return withCorsResponse(
      req,
      errJson("CREATOR_ADDRESS_NOT_AVAILABLE", 404),
      undefined,
      corsReadOnlyMethods
    );
  }

  const { searchParams } = new URL(req.url);
  const requestedChainId = searchParams.get("chainId");
  const asset: ExternalWalletTipAssetKey = parseExternalWalletTipAsset(
    searchParams.get("asset")
  );
  const chainId = requestedChainId
    ? parseExternalWalletTipChainId(
        requestedChainId,
        DEFAULT_EXTERNAL_TIP_CHAIN_ID
      )
    : getDefaultChainId();

  let qrPayload;
  try {
    qrPayload = buildExternalWalletTipQrPayload({
      address: creator.creator.address,
      chainId,
      asset,
      amountInput: searchParams.get("amount"),
    });
  } catch (error: unknown) {
    return withCorsResponse(
      req,
      errJson(
        "TIP_QR_PAYLOAD_INVALID",
        400,
        error instanceof Error ? error.message : String(error)
      ),
      undefined,
      corsReadOnlyMethods
    );
  }

  const png = await renderQrCodePng(qrPayload.qrText);
  const response = new NextResponse(new Uint8Array(png), { status: 200 });
  applyQrCodePngResponseHeaders(response.headers, null);

  return withCorsResponse(req, response, undefined, corsReadOnlyMethods);
}
