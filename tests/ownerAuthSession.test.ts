import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { DEV_OWNER_AUTH_OVERRIDE_HEADER } from "@/lib/manualCheckDev";
import {
  OWNER_SESSION_COOKIE_NAME,
  buildOwnerAuthMessage,
  createOwnerSession,
  issueOwnerAuthNonce,
  requireOwnerSession,
} from "@/lib/ownerAuthSession";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";
const NOW = new Date("2026-03-20T00:00:00.000Z");

test("issueOwnerAuthNonce stores the generated nonce and returns the signed message", async () => {
  let stored:
    | {
        address: string;
        nonce: string;
        expiresAt: Date;
      }
    | null = null;

  const result = await issueOwnerAuthNonce(OWNER_ADDRESS, {
    now: () => NOW,
    randomHex: () => "nonce-token",
    upsertNonce: async (args) => {
      stored = args;
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected nonce issuance result");
  }

  assert.deepEqual(stored, {
    address: OWNER_ADDRESS,
    nonce: "nonce-token",
    expiresAt: new Date("2026-03-20T00:05:00.000Z"),
  });
  assert.equal(result.message, buildOwnerAuthMessage(OWNER_ADDRESS, "nonce-token"));
  assert.equal(result.expiresAt.toISOString(), "2026-03-20T00:05:00.000Z");
});

test("createOwnerSession rotates the nonce into a session token on the happy path", async () => {
  let rotated:
    | {
        address: string;
        nonce: string;
        expiresAt: Date;
      }
    | null = null;

  const result = await createOwnerSession(
    {
      address: OWNER_ADDRESS,
      message: buildOwnerAuthMessage(OWNER_ADDRESS, "nonce-token"),
      signature: "0xsigned",
    },
    {
      now: () => NOW,
      randomHex: () => "session-token",
      findNonce: async () => ({
        nonce: "nonce-token",
        expiresAt: new Date("2026-03-20T00:01:00.000Z"),
      }),
      verifyMessage: () => OWNER_ADDRESS,
      updateNonce: async (args) => {
        rotated = args;
      },
    }
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected session result");
  }

  assert.equal(result.address, OWNER_ADDRESS);
  assert.equal(result.sessionToken, "session-token");
  assert.equal(result.expiresAt.toISOString(), "2026-03-20T12:00:00.000Z");
  assert.deepEqual(rotated, {
    address: OWNER_ADDRESS,
    nonce: "session-token",
    expiresAt: new Date("2026-03-20T12:00:00.000Z"),
  });
});

test("createOwnerSession rejects expired nonces before signature verification", async () => {
  const result = await createOwnerSession(
    {
      address: OWNER_ADDRESS,
      message: buildOwnerAuthMessage(OWNER_ADDRESS, "nonce-token"),
      signature: "0xsigned",
    },
    {
      now: () => NOW,
      findNonce: async () => ({
        nonce: "nonce-token",
        expiresAt: new Date("2026-03-19T23:59:59.000Z"),
      }),
      verifyMessage: () => {
        throw new Error("should not verify expired nonce");
      },
    }
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected expired nonce failure");
  }
  assert.equal(result.response.status, 401);
  assert.deepEqual(await result.response.json(), {
    ok: false,
    error: "OWNER_AUTH_NONCE_EXPIRED",
  });
});

test("createOwnerSession rejects signatures recovered for a different address", async () => {
  const result = await createOwnerSession(
    {
      address: OWNER_ADDRESS,
      message: buildOwnerAuthMessage(OWNER_ADDRESS, "nonce-token"),
      signature: "0xsigned",
    },
    {
      now: () => NOW,
      findNonce: async () => ({
        nonce: "nonce-token",
        expiresAt: new Date("2026-03-20T00:01:00.000Z"),
      }),
      verifyMessage: () => "0x2222222222222222222222222222222222222222",
    }
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected signature mismatch failure");
  }
  assert.equal(result.response.status, 401);
  assert.deepEqual(await result.response.json(), {
    ok: false,
    error: "OWNER_AUTH_SIGNATURE_INVALID",
  });
});

test("requireOwnerSession accepts a matching cookie-backed session", async () => {
  const request = new NextRequest("http://127.0.0.1/test", {
    headers: {
      cookie: `${OWNER_SESSION_COOKIE_NAME}=${OWNER_ADDRESS}:session-token`,
    },
  });

  const result = await requireOwnerSession(request, OWNER_ADDRESS, {
    now: () => NOW,
    findNonce: async () => ({
      nonce: "session-token",
      expiresAt: new Date("2026-03-20T00:30:00.000Z"),
    }),
  });

  assert.deepEqual(result, {
    ok: true,
    address: OWNER_ADDRESS,
  });
});

test("requireOwnerSession clears the session when the cookie token is stale", async () => {
  const request = new NextRequest("http://127.0.0.1/test", {
    headers: {
      cookie: `${OWNER_SESSION_COOKIE_NAME}=${OWNER_ADDRESS}:old-token`,
    },
  });

  const result = await requireOwnerSession(request, OWNER_ADDRESS, {
    now: () => NOW,
    findNonce: async () => ({
      nonce: "new-token",
      expiresAt: new Date("2026-03-20T00:30:00.000Z"),
    }),
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected stale session failure");
  }
  assert.equal(result.response.status, 401);
  assert.deepEqual(await result.response.json(), {
    ok: false,
    error: "OWNER_AUTH_REQUIRED",
  });
});

test("requireOwnerSession accepts a local dev override header", async () => {
  const request = new NextRequest("http://127.0.0.1:3001/api/me", {
    headers: {
      [DEV_OWNER_AUTH_OVERRIDE_HEADER]: OWNER_ADDRESS,
    },
  });

  const result = await requireOwnerSession(request, OWNER_ADDRESS);

  assert.deepEqual(result, {
    ok: true,
    address: OWNER_ADDRESS,
  });
});
