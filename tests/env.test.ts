import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAvatarUploadEnv,
  parseBridgeRuntimeEnv,
  parseCorsEnv,
  parseEventChainEnv,
  parseEventRpcEnv,
  parseGasSupportEnv,
} from "@/lib/env";
import { parsePublicEnv } from "@/lib/publicEnv";

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";
const PRIVATE_KEY =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

test("parsePublicEnv reads public env values and alias fallbacks", () => {
  const env = parsePublicEnv({
    NEXT_PUBLIC_PROJECT_ID: "creator-founding-project",
    NEXT_PUBLIC_CHAIN_ID: "137",
    NEXT_PUBLIC_WC_PROJECT_ID: "wallet-connect-project",
    NEXT_PUBLIC_RPC_URL: "https://polygon-rpc.example.com",
    NEXT_PUBLIC_ETHEREUM_CHAIN_ID: "11155111",
    NEXT_PUBLIC_JPYC_ADDRESS: ADDRESS_A,
    NEXT_PUBLIC_USDC_ADDRESS: ADDRESS_B,
    NEXT_PUBLIC_USDC_ADDRESS_AVAX: ADDRESS_B,
    NEXT_PUBLIC_BASE_URL: "https://creator.example.com",
  });

  assert.equal(env.projectId, "creator-founding-project");
  assert.equal(env.walletConnectProjectId, "wallet-connect-project");
  assert.equal(env.defaultChainId, 137);
  assert.equal(env.polygonChainId, 137);
  assert.equal(env.ethereumChainId, 11155111);
  assert.equal(env.rpcUrlPolygon, "https://polygon-rpc.example.com/");
  assert.equal(env.jpycAddress, ADDRESS_A);
  assert.equal(env.usdcAddress, ADDRESS_B);
  assert.equal(env.usdcAddressAvax, ADDRESS_B);
  assert.equal(env.baseUrl, "https://creator.example.com/");
});

test("parsePublicEnv falls back to projectId for wallet connect", () => {
  const env = parsePublicEnv({
    NEXT_PUBLIC_PROJECT_ID: "creator-founding-project",
  });

  assert.equal(env.walletConnectProjectId, "creator-founding-project");
});

test("parseBridgeRuntimeEnv requires rpc urls", () => {
  const env = parseBridgeRuntimeEnv({
    POLYGON_RPC_URL: "https://polygon-rpc.example.com",
    AVALANCHE_RPC_URL: "https://avax-rpc.example.com",
  });

  assert.equal(env.polygonRpcUrl, "https://polygon-rpc.example.com/");
  assert.equal(env.avalancheRpcUrl, "https://avax-rpc.example.com/");
  assert.equal(env.polygonAmoyRpcUrl, null);
  assert.equal(env.avalancheFujiRpcUrl, null);
});

test("parseEventChainEnv validates required event runtime values", () => {
  const env = parseEventChainEnv({
    EVENT_RPC_POLYGON: "https://polygon-rpc.example.com",
    EVENT_RPC_AVAX: "https://avax-rpc.example.com",
    EVENT_OPERATOR_PRIVATE_KEY: PRIVATE_KEY,
  });

  assert.equal(env.eventRpcPolygon, "https://polygon-rpc.example.com/");
  assert.equal(env.eventRpcAvax, "https://avax-rpc.example.com/");
  assert.equal(env.eventOperatorPrivateKey, PRIVATE_KEY);
});

test("parseEventRpcEnv accepts avalanche and polygon rpc aliases", () => {
  const env = parseEventRpcEnv({
    POLYGON_RPC_URL: "https://polygon-rpc.example.com",
    EVENT_RPC_AVALANCHE: "https://avax-rpc.example.com",
    POLYGON_AMOY_RPC_URL: "https://polygon-amoy-rpc.example.com",
  });

  assert.equal(env.eventRpcPolygon, "https://polygon-rpc.example.com/");
  assert.equal(env.eventRpcAvax, "https://avax-rpc.example.com/");
  assert.equal(env.eventRpcPolygonAmoy, "https://polygon-amoy-rpc.example.com/");
});

test("parseGasSupportEnv validates private keys and address fallbacks", () => {
  const env = parseGasSupportEnv({
    CHAIN_ID: "43114",
    FAUCET_PRIVATE_KEY: PRIVATE_KEY,
    FAUCET_PRIVATE_KEY_AVAX: PRIVATE_KEY,
    JPYC_ADDRESS: ADDRESS_A,
  });

  assert.equal(env.defaultChainId, 43114);
  assert.equal(env.faucetPrivateKey, PRIVATE_KEY);
  assert.equal(env.faucetPrivateKeyAvax, PRIVATE_KEY);
  assert.equal(env.jpycAddress, ADDRESS_A);
});

test("parseAvatarUploadEnv requires supabase url and service key", () => {
  const env = parseAvatarUploadEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_KEY: "service-key",
  });

  assert.equal(env.supabaseUrl, "https://project.supabase.co/");
  assert.equal(env.supabaseServiceKey, "service-key");
});

test("parseCorsEnv reads explicit origins and base url", () => {
  const env = parseCorsEnv({
    NODE_ENV: "production",
    CORS_ALLOWED_ORIGINS:
      "https://creator.example.com, https://admin.example.com",
    NEXT_PUBLIC_BASE_URL: "https://creator.example.com/app",
  });

  assert.deepEqual(env.allowedOrigins, [
    "https://creator.example.com",
    "https://admin.example.com",
  ]);
});

test("parseCorsEnv falls back to local defaults outside production", () => {
  const env = parseCorsEnv({
    NODE_ENV: "development",
  });

  assert.deepEqual(env.allowedOrigins, [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);
});

test("parseEventChainEnv rejects malformed private keys", () => {
  assert.throws(
    () =>
      parseEventChainEnv({
        EVENT_RPC_POLYGON: "https://polygon-rpc.example.com",
        EVENT_RPC_AVAX: "https://avax-rpc.example.com",
        EVENT_OPERATOR_PRIVATE_KEY: "invalid",
      }),
    /INVALID_EVENT_OPERATOR_PRIVATE_KEY/
  );
});
