import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY,
} from "@/lib/publicViewerIdentityCacheConfig";
import {
  clearPublicViewerIdentityCache,
  ensurePublicViewerIdentityCacheSync,
  fetchMeResponseCached,
  handlePublicViewerIdentityStorageEvent,
  resetPublicViewerIdentityClientForTests,
} from "@/lib/publicViewerIdentityClient";

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";

type FetchStub = typeof fetch;

class FakeLocalStorage {
  private readonly store = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
}

class FakeWindow {
  readonly localStorage = new FakeLocalStorage();
  private storageListeners = new Set<(event: { key: string | null; newValue: string | null }) => void>();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    if (type !== "storage") return;
    if (typeof listener === "function") {
      this.storageListeners.add(
        listener as unknown as (event: {
          key: string | null;
          newValue: string | null;
        }) => void
      );
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    if (type !== "storage") return;
    if (typeof listener === "function") {
      this.storageListeners.delete(
        listener as unknown as (event: {
          key: string | null;
          newValue: string | null;
        }) => void
      );
    }
  }

  dispatchStorage(key: string, newValue: string): void {
    for (const listener of this.storageListeners) {
      listener({ key, newValue });
    }
  }
}

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
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

function installFakeWindow(fakeWindow: FakeWindow): () => void {
  const originalWindow = globalThis.window;
  Object.assign(globalThis, { window: fakeWindow });
  return () => {
    if (typeof originalWindow === "undefined") {
      Reflect.deleteProperty(globalThis, "window");
      return;
    }
    Object.assign(globalThis, { window: originalWindow });
  };
}

test("handlePublicViewerIdentityStorageEvent clears only the targeted cached viewer", async () => {
  resetPublicViewerIdentityClientForTests();

  const requestCounts = new Map<string, number>();
  const restoreFetch = installFetchStub(async (input) => {
    const url = String(input);
    const address =
      new URL(url, "http://127.0.0.1").searchParams.get("address") ?? "";
    requestCounts.set(address, (requestCounts.get(address) ?? 0) + 1);
    return okJson({ me: { address } });
  });

  try {
    await fetchMeResponseCached(ADDRESS_A);
    await fetchMeResponseCached(ADDRESS_B);
    await fetchMeResponseCached(ADDRESS_A);

    assert.equal(requestCounts.get(ADDRESS_A), 1);
    assert.equal(requestCounts.get(ADDRESS_B), 1);

    handlePublicViewerIdentityStorageEvent({
      key: PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY,
      newValue: JSON.stringify({
        scope: "address",
        address: ADDRESS_A,
        at: 1,
        nonce: "n1",
      }),
    });

    await fetchMeResponseCached(ADDRESS_A);
    await fetchMeResponseCached(ADDRESS_B);

    assert.equal(requestCounts.get(ADDRESS_A), 2);
    assert.equal(requestCounts.get(ADDRESS_B), 1);
  } finally {
    restoreFetch();
    resetPublicViewerIdentityClientForTests();
  }
});

test("clearPublicViewerIdentityCache broadcasts invalidation through localStorage", () => {
  resetPublicViewerIdentityClientForTests();

  const fakeWindow = new FakeWindow();
  const restoreWindow = installFakeWindow(fakeWindow);

  try {
    clearPublicViewerIdentityCache(ADDRESS_A);

    const payload = fakeWindow.localStorage.getItem(
      PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY
    );
    assert.ok(payload);
    assert.match(payload, /"scope":"address"/);
    assert.match(payload, /1111111111111111111111111111111111111111/i);
  } finally {
    restoreWindow();
    resetPublicViewerIdentityClientForTests();
  }
});

test("ensurePublicViewerIdentityCacheSync clears cached viewers when another tab broadcasts invalidation", async () => {
  resetPublicViewerIdentityClientForTests();

  const fakeWindow = new FakeWindow();
  const restoreWindow = installFakeWindow(fakeWindow);
  const requestCounts = new Map<string, number>();
  const restoreFetch = installFetchStub(async (input) => {
    const url = String(input);
    const address =
      new URL(url, "http://127.0.0.1").searchParams.get("address") ?? "";
    requestCounts.set(address, (requestCounts.get(address) ?? 0) + 1);
    return okJson({ me: { address } });
  });

  try {
    ensurePublicViewerIdentityCacheSync(fakeWindow as never);
    await fetchMeResponseCached(ADDRESS_A);
    assert.equal(requestCounts.get(ADDRESS_A), 1);

    fakeWindow.dispatchStorage(
      PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY,
      JSON.stringify({
        scope: "address",
        address: ADDRESS_A,
        at: 2,
        nonce: "n2",
      })
    );

    await fetchMeResponseCached(ADDRESS_A);
    assert.equal(requestCounts.get(ADDRESS_A), 2);
  } finally {
    restoreFetch();
    restoreWindow();
    resetPublicViewerIdentityClientForTests();
  }
});
