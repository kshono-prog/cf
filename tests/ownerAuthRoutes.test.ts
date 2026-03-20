import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { errJson } from "@/lib/api/responses";
import {
  handleOwnerAuthNonceGet,
  handleOwnerAuthSessionPost,
} from "@/lib/ownerAuthApi";
import {
  OWNER_SESSION_COOKIE_NAME,
} from "@/lib/ownerAuthSession";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";

test("handleOwnerAuthNonceGet returns the ok envelope from the nonce issuer", async () => {
  const request = new NextRequest(
    `http://127.0.0.1/api/owner-auth/nonce?address=${OWNER_ADDRESS}`
  );

  const response = await handleOwnerAuthNonceGet(request, {
    issueOwnerAuthNonce: async () => ({
      ok: true,
      address: OWNER_ADDRESS,
      message: "sign-me",
      expiresAt: new Date("2026-03-20T00:05:00.000Z"),
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    address: OWNER_ADDRESS,
    message: "sign-me",
    expiresAt: "2026-03-20T00:05:00.000Z",
  });
});

test("handleOwnerAuthSessionPost sets the owner session cookie on success", async () => {
  const request = new NextRequest("http://127.0.0.1/api/owner-auth/session", {
    method: "POST",
    body: JSON.stringify({
      address: OWNER_ADDRESS,
      message: "sign-me",
      signature: "0xsigned",
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  const response = await handleOwnerAuthSessionPost(request, {
    createOwnerSession: async () => ({
      ok: true,
      address: OWNER_ADDRESS,
      sessionToken: "session-token",
      expiresAt: new Date("2026-03-20T12:00:00.000Z"),
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    address: OWNER_ADDRESS,
    expiresAt: "2026-03-20T12:00:00.000Z",
  });
  const cookieHeader = response.headers.get("set-cookie");
  assert.ok(cookieHeader);
  assert.match(cookieHeader, new RegExp(`^${OWNER_SESSION_COOKIE_NAME}=`));
  assert.match(cookieHeader, /HttpOnly/i);
});

test("handleOwnerAuthSessionPost rejects invalid json payloads", async () => {
  const request = new NextRequest("http://127.0.0.1/api/owner-auth/session", {
    method: "POST",
    body: "{",
    headers: {
      "content-type": "application/json",
    },
  });

  const response = await handleOwnerAuthSessionPost(request);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "INVALID_JSON",
  });
});

test("handleOwnerAuthSessionPost forwards owner auth failures", async () => {
  const request = new NextRequest("http://127.0.0.1/api/owner-auth/session", {
    method: "POST",
    body: JSON.stringify({
      address: OWNER_ADDRESS,
      message: "sign-me",
      signature: "0xsigned",
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  const response = await handleOwnerAuthSessionPost(request, {
    createOwnerSession: async () => ({
      ok: false,
      response: errJson("OWNER_AUTH_SIGNATURE_INVALID", 401),
    }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "OWNER_AUTH_SIGNATURE_INVALID",
  });
});

test("handleOwnerAuthSessionPost returns 500 when the owner auth flow crashes", async () => {
  const request = new NextRequest("http://127.0.0.1/api/owner-auth/session", {
    method: "POST",
    body: JSON.stringify({
      address: OWNER_ADDRESS,
      message: "sign-me",
      signature: "0xsigned",
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  const response = await handleOwnerAuthSessionPost(request, {
    createOwnerSession: async () => {
      throw new Error("boom");
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "OWNER_AUTH_SESSION_POST_FAILED",
  });
});
