/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import test from "node:test";
import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";

const creatorProfileModule = require("../lib/creatorProfile") as typeof import("../lib/creatorProfile");
const publicProfileQrRouteModule = require("../app/api/creators/[username]/qrcode/route") as typeof import("../app/api/creators/[username]/qrcode/route");
const creatorProfileMutable = creatorProfileModule as {
  getCreatorProfileByUsername: typeof creatorProfileModule.getCreatorProfileByUsername;
};

const ALLOWED_ORIGIN = "http://127.0.0.1:3001";

const creatorLookupResult = {
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
  },
  profile: {
    id: "1",
    username: "kazu",
    walletAddress: null,
    activeProjectIdJpyc: null,
    activeProjectIdUsdc: null,
  },
};

test("public profile qr route returns png bytes and varies by forwarded host", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async (
    username: string
  ) =>
    username === "kazu" ? creatorLookupResult : null;

  try {
    const responseA = await publicProfileQrRouteModule.GET(
      new NextRequest("http://internal/api/creators/kazu/qrcode", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "x-forwarded-host": "preview-a.example.com",
          "x-forwarded-proto": "https",
        },
      }),
      { params: Promise.resolve({ username: "kazu" }) }
    );
    const responseB = await publicProfileQrRouteModule.GET(
      new NextRequest("http://internal/api/creators/kazu/qrcode", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "x-forwarded-host": "preview-b.example.com",
          "x-forwarded-proto": "https",
        },
      }),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(responseA.status, 200);
    assert.equal(responseA.headers.get("Content-Type"), "image/png");
    assert.equal(
      responseA.headers.get("Access-Control-Allow-Methods"),
      "GET,OPTIONS"
    );
    assert.equal(
      responseA.headers.get("Access-Control-Allow-Origin"),
      ALLOWED_ORIGIN
    );
    assert.match(responseA.headers.get("Vary") ?? "", /X-Forwarded-Host/);

    const pngA = Buffer.from(await responseA.arrayBuffer());
    const pngB = Buffer.from(await responseB.arrayBuffer());

    assert.equal(pngA.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(pngB.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.notEqual(pngA.toString("base64"), pngB.toString("base64"));
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});

test("public profile qr route returns 404 when creator is missing", async () => {
  const original = creatorProfileMutable.getCreatorProfileByUsername;
  creatorProfileMutable.getCreatorProfileByUsername = async () => null;

  try {
    const response = await publicProfileQrRouteModule.GET(
      new NextRequest("http://internal/api/creators/missing/qrcode", {
        headers: { origin: ALLOWED_ORIGIN },
      }),
      { params: Promise.resolve({ username: "missing" }) }
    );

    assert.equal(response.status, 404);
    const body = (await response.json()) as { ok: false; error: string };
    assert.deepEqual(body, { ok: false, error: "CREATOR_NOT_FOUND" });
  } finally {
    creatorProfileMutable.getCreatorProfileByUsername = original;
  }
});
