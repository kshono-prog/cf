import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreatorProfilePublicUrl,
  buildCreatorProfileQrCodePath,
  isReusableCreatorProfileQrCodeUrl,
  normalizeCreatorProfileQrCodeUrl,
} from "../lib/profileQrCode";
import { resolveCreatorProfileQrCodePersistence } from "../lib/profileQrCodeServer";

test("normalizeCreatorProfileQrCodeUrl converts absolute urls into app-relative paths", () => {
  assert.equal(
    normalizeCreatorProfileQrCodeUrl(
      "https://preview.example.com/api/creators/kazu/qrcode"
    ),
    "/api/creators/kazu/qrcode"
  );
});

test("isReusableCreatorProfileQrCodeUrl accepts canonical relative and absolute route urls", () => {
  assert.equal(
    isReusableCreatorProfileQrCodeUrl("/api/creators/kazu/qrcode", "kazu"),
    true
  );
  assert.equal(
    isReusableCreatorProfileQrCodeUrl(
      "https://staging.example.com/api/creators/kazu/qrcode",
      "kazu"
    ),
    true
  );
  assert.equal(
    isReusableCreatorProfileQrCodeUrl("/api/creators/mika/qrcode", "kazu"),
    false
  );
});

test("resolveCreatorProfileQrCodePersistence reuses canonical qr routes and rewrites stale values", () => {
  assert.deepEqual(
    resolveCreatorProfileQrCodePersistence({
      username: "kazu",
      currentQrcodeUrl: "https://old.example.com/api/creators/kazu/qrcode",
    }),
    {
      qrcodeUrl: buildCreatorProfileQrCodePath("kazu"),
      reused: true,
      shouldPersist: false,
    }
  );

  assert.deepEqual(
    resolveCreatorProfileQrCodePersistence({
      username: "kazu",
      currentQrcodeUrl: "https://old.example.com/public/qr/kazu.png",
    }),
    {
      qrcodeUrl: buildCreatorProfileQrCodePath("kazu"),
      reused: false,
      shouldPersist: true,
    }
  );
});

test("buildCreatorProfilePublicUrl joins current host and username", () => {
  assert.equal(
    buildCreatorProfilePublicUrl("kazu", "https://preview.example.com"),
    "https://preview.example.com/kazu"
  );
});
