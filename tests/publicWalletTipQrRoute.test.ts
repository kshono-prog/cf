/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import test from "node:test";
import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID ?? "test-project-id";
process.env.NEXT_PUBLIC_JPYC_ADDRESS_POLYGON =
  process.env.NEXT_PUBLIC_JPYC_ADDRESS_POLYGON ??
  "0x2222222222222222222222222222222222222222";
process.env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON =
  process.env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON ??
  "0x3333333333333333333333333333333333333333";
process.env.NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM = "";
process.env.NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM = "";
process.env.NEXT_PUBLIC_JPYC_ADDRESS_AVAX = "";
process.env.NEXT_PUBLIC_USDC_ADDRESS_AVAX = "";

const creatorProfileModule = require("../lib/creatorProfile") as typeof import("../lib/creatorProfile");
const publicWalletTipQrRouteModule = require("../app/api/creators/[username]/wallet-tip-qrcode/route") as typeof import("../app/api/creators/[username]/wallet-tip-qrcode/route");
const creatorProfileMutable = creatorProfileModule as {
  getCreatorProfileByUsername: typeof creatorProfileModule.getCreatorProfileByUsername;
};

const ALLOWED_ORIGIN = "http://127.0.0.1:3001";
const CREATOR_ADDRESS = "0x1111111111111111111111111111111111111111";

const creatorLookupResult: NonNullable<
  Awaited<ReturnType<typeof creatorProfileModule.getCreatorProfileByUsername>>
> = {
  creator: {
    username: "kazu",
    displayName: "Kazu",
    profile: "creator profile",
    avatarUrl: null,
    qrcode: null,
    url: null,
    themeColor: null,
    creatorType: null,
    ecosystemRole: null,
    socials: undefined,
    youtubeVideos: undefined,
    address: CREATOR_ADDRESS,
  },
  profile: {
    id: "1",
    username: "kazu",
    walletAddress: CREATOR_ADDRESS,
    activeProjectIdJpyc: null,
    activeProjectIdUsdc: null,
  },
};

test("public wallet tip qr route returns different pngs for native and token payloads", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async (username: string) =>
    username === "kazu" ? creatorLookupResult : null;

  try {
    const nativeResponse = await publicWalletTipQrRouteModule.GET(
      new NextRequest(
        "http://internal/api/creators/kazu/wallet-tip-qrcode?chainId=137&asset=NATIVE",
        {
          headers: { origin: ALLOWED_ORIGIN },
        }
      ),
      { params: Promise.resolve({ username: "kazu" }) }
    );
    const tokenResponse = await publicWalletTipQrRouteModule.GET(
      new NextRequest(
        "http://internal/api/creators/kazu/wallet-tip-qrcode?chainId=137&asset=USDC&amount=1.25",
        {
          headers: { origin: ALLOWED_ORIGIN },
        }
      ),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(nativeResponse.status, 200);
    assert.equal(tokenResponse.status, 200);
    assert.equal(nativeResponse.headers.get("Content-Type"), "image/png");
    assert.equal(
      nativeResponse.headers.get("Access-Control-Allow-Origin"),
      ALLOWED_ORIGIN
    );
    assert.equal(
      nativeResponse.headers.get("Access-Control-Allow-Methods"),
      "GET,OPTIONS"
    );

    const nativePng = Buffer.from(await nativeResponse.arrayBuffer());
    const tokenPng = Buffer.from(await tokenResponse.arrayBuffer());

    assert.equal(nativePng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(tokenPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.notEqual(nativePng.toString("base64"), tokenPng.toString("base64"));
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});

test("public wallet tip qr route returns 404 when creator address is missing", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async () => ({
    ...creatorLookupResult,
    creator: {
      ...creatorLookupResult.creator,
      address: undefined,
    },
    profile: {
      ...creatorLookupResult.profile,
      walletAddress: null,
    },
  });

  try {
    const response = await publicWalletTipQrRouteModule.GET(
      new NextRequest("http://internal/api/creators/kazu/wallet-tip-qrcode", {
        headers: { origin: ALLOWED_ORIGIN },
      }),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(response.status, 404);
    const body = (await response.json()) as { ok: false; error: string };
    assert.deepEqual(body, {
      ok: false,
      error: "CREATOR_ADDRESS_NOT_AVAILABLE",
    });
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});

test("public wallet tip qr route returns 400 for invalid amount payloads", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async (username: string) =>
    username === "kazu" ? creatorLookupResult : null;

  try {
    const response = await publicWalletTipQrRouteModule.GET(
      new NextRequest(
        "http://internal/api/creators/kazu/wallet-tip-qrcode?chainId=137&asset=USDC&amount=0",
        {
          headers: { origin: ALLOWED_ORIGIN },
        }
      ),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      ok: false;
      error: string;
      detail?: string;
    };
    assert.equal(body.error, "TIP_QR_PAYLOAD_INVALID");
    assert.equal(body.detail, "TIP_AMOUNT_INVALID");
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});

test("public wallet tip qr route returns 400 for unsupported token on the selected chain", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async (username: string) =>
    username === "kazu" ? creatorLookupResult : null;

  try {
    const response = await publicWalletTipQrRouteModule.GET(
      new NextRequest(
        "http://internal/api/creators/kazu/wallet-tip-qrcode?chainId=1&asset=JPYC&amount=1",
        {
          headers: { origin: ALLOWED_ORIGIN },
        }
      ),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      ok: false;
      error: string;
      detail?: string;
    };
    assert.equal(body.error, "TIP_QR_PAYLOAD_INVALID");
    assert.equal(body.detail, "TIP_ASSET_UNAVAILABLE");
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});
