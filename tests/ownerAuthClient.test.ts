import assert from "node:assert/strict";
import test from "node:test";

import {
  clearOwnerAuthSessionCache,
  ensureOwnerSession,
  ownerAuthFetch,
  registerOwnerAuthDevOverride,
  registerOwnerAuthSigner,
} from "@/lib/ownerAuthClient";
import { DEV_OWNER_AUTH_OVERRIDE_HEADER } from "@/lib/manualCheckDev";
import {
  fetchMeResponseCached,
  resetPublicViewerIdentityClientForTests,
} from "@/lib/publicViewerIdentityClient";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";

type FetchStub = typeof fetch;

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function installFetchStub(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = implementation as FetchStub;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

function resetOwnerAuthClientState(): void {
  registerOwnerAuthSigner(null, null);
  registerOwnerAuthDevOverride(null);
  clearOwnerAuthSessionCache();
  resetPublicViewerIdentityClientForTests();
}

test("ensureOwnerSession invalidates cached viewer identity after session creation", async () => {
  resetOwnerAuthClientState();

  let viewerFetchCount = 0;
  let nonceFetchCount = 0;
  let sessionFetchCount = 0;

  registerOwnerAuthSigner(OWNER_ADDRESS, async () => "0xsigned");

  const restoreFetch = installFetchStub(async (input) => {
    const url = String(input);
    if (url.includes("/api/public/viewer")) {
      viewerFetchCount += 1;
      return okJson({ me: { address: OWNER_ADDRESS } });
    }
    if (url.includes("/api/owner-auth/nonce")) {
      nonceFetchCount += 1;
      return okJson({
        ok: true,
        address: OWNER_ADDRESS,
        message: "sign this",
        expiresAt: "2026-03-21T01:00:00.000Z",
      });
    }
    if (url.endsWith("/api/owner-auth/session")) {
      sessionFetchCount += 1;
      return okJson({
        ok: true,
        address: OWNER_ADDRESS,
        expiresAt: "2026-03-21T02:00:00.000Z",
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  try {
    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 1);

    await ensureOwnerSession({ address: OWNER_ADDRESS });

    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 2);
    assert.equal(nonceFetchCount, 1);
    assert.equal(sessionFetchCount, 1);
  } finally {
    restoreFetch();
    resetOwnerAuthClientState();
  }
});

test("ensureOwnerSession invalidates cached viewer identity when owner auth fails", async () => {
  resetOwnerAuthClientState();

  let viewerFetchCount = 0;

  registerOwnerAuthSigner(OWNER_ADDRESS, async () => "0xsigned");

  const restoreFetch = installFetchStub(async (input) => {
    const url = String(input);
    if (url.includes("/api/public/viewer")) {
      viewerFetchCount += 1;
      return okJson({ me: { address: OWNER_ADDRESS } });
    }
    if (url.includes("/api/owner-auth/nonce")) {
      return okJson({ ok: false }, 500);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  try {
    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 1);

    await assert.rejects(
      ensureOwnerSession({ address: OWNER_ADDRESS }),
      /OWNER_AUTH_NONCE_FAILED/
    );

    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 2);
  } finally {
    restoreFetch();
    resetOwnerAuthClientState();
  }
});

test("ownerAuthFetch invalidates cached viewer identity after a 401 retry", async () => {
  resetOwnerAuthClientState();

  let viewerFetchCount = 0;
  let nonceFetchCount = 0;
  let sessionFetchCount = 0;
  let protectedFetchCount = 0;

  registerOwnerAuthSigner(OWNER_ADDRESS, async () => "0xsigned");

  const restoreFetch = installFetchStub(async (input) => {
    const url = String(input);
    if (url.includes("/api/public/viewer")) {
      viewerFetchCount += 1;
      return okJson({ me: { address: OWNER_ADDRESS } });
    }
    if (url.includes("/api/owner-auth/nonce")) {
      nonceFetchCount += 1;
      return okJson({
        ok: true,
        address: OWNER_ADDRESS,
        message: "sign this",
        expiresAt: "2026-03-21T01:00:00.000Z",
      });
    }
    if (url.endsWith("/api/owner-auth/session")) {
      sessionFetchCount += 1;
      return okJson({
        ok: true,
        address: OWNER_ADDRESS,
        expiresAt: "2026-03-21T02:00:00.000Z",
      });
    }
    if (url.endsWith("/api/protected")) {
      protectedFetchCount += 1;
      if (protectedFetchCount === 1) {
        return okJson({ ok: false, error: "UNAUTHORIZED" }, 401);
      }
      return okJson({ ok: true }, 200);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  try {
    await ensureOwnerSession({ address: OWNER_ADDRESS });
    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 1);

    const response = await ownerAuthFetch({
      address: OWNER_ADDRESS,
      url: "/api/protected",
    });

    assert.equal(response.status, 200);

    await fetchMeResponseCached(OWNER_ADDRESS);
    assert.equal(viewerFetchCount, 2);
    assert.equal(protectedFetchCount, 2);
    assert.equal(nonceFetchCount, 3);
    assert.equal(sessionFetchCount, 3);
  } finally {
    restoreFetch();
    resetOwnerAuthClientState();
  }
});

test("ownerAuthFetch uses the local dev override header without requiring a signer", async () => {
  resetOwnerAuthClientState();
  registerOwnerAuthDevOverride(OWNER_ADDRESS);

  let protectedFetchCount = 0;

  const restoreFetch = installFetchStub(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/protected")) {
      protectedFetchCount += 1;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get(DEV_OWNER_AUTH_OVERRIDE_HEADER), OWNER_ADDRESS);
      return okJson({ ok: true }, 200);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  try {
    const response = await ownerAuthFetch({
      address: OWNER_ADDRESS,
      url: "/api/protected",
    });

    assert.equal(response.status, 200);
    assert.equal(protectedFetchCount, 1);
  } finally {
    restoreFetch();
    resetOwnerAuthClientState();
  }
});
