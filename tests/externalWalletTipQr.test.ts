/* eslint-disable @typescript-eslint/no-require-imports */

import assert from "node:assert/strict";
import test from "node:test";

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

const externalWalletTipQrModule = require("../lib/externalWalletTipQr") as typeof import("../lib/externalWalletTipQr");

const CREATOR_ADDRESS = "0x1111111111111111111111111111111111111111";

test("normalizeExternalWalletTipAmountInput sanitizes pasted values and caps precision", () => {
  assert.equal(
    externalWalletTipQrModule.normalizeExternalWalletTipAmountInput(
      " 0.123456789012345678999 POL "
    ),
    "0.123456789012345678"
  );
  assert.equal(
    externalWalletTipQrModule.normalizeExternalWalletTipAmountInput(".5"),
    "0.5"
  );
  assert.equal(
    externalWalletTipQrModule.normalizeExternalWalletTipAmountInput("1."),
    "1."
  );
  assert.equal(
    externalWalletTipQrModule.normalizeExternalWalletTipAmountInput("."),
    "0."
  );
});

test("listExternalWalletTipAssets returns native and configured ERC-20 assets", () => {
  assert.deepEqual(
    externalWalletTipQrModule
      .listExternalWalletTipAssets(137)
      .map((asset) => asset.key),
    ["NATIVE", "JPYC", "USDC"]
  );
});

test("buildExternalWalletTipQrPayload returns an address qr when native amount is blank", () => {
  assert.deepEqual(
    externalWalletTipQrModule.buildExternalWalletTipQrPayload({
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "NATIVE",
      amountInput: "",
    }),
    {
      mode: "address",
      qrText: CREATOR_ADDRESS,
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "NATIVE",
      assetKind: "native",
      displayName: "Polygon",
      symbol: "POL",
      amount: null,
      amountBaseUnits: null,
      tokenAddress: null,
    }
  );
});

test("buildExternalWalletTipQrPayload returns a native transfer uri when amount is present", () => {
  assert.deepEqual(
    externalWalletTipQrModule.buildExternalWalletTipQrPayload({
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "NATIVE",
      amountInput: "0.5",
    }),
    {
      mode: "native-transfer",
      qrText: `ethereum:${CREATOR_ADDRESS}@137?value=500000000000000000`,
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "NATIVE",
      assetKind: "native",
      displayName: "Polygon",
      symbol: "POL",
      amount: "0.5",
      amountBaseUnits: "500000000000000000",
      tokenAddress: null,
    }
  );
});

test("buildExternalWalletTipQrPayload returns an ERC-20 transfer uri when token amount is present", () => {
  assert.deepEqual(
    externalWalletTipQrModule.buildExternalWalletTipQrPayload({
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "USDC",
      amountInput: "1.25",
    }),
    {
      mode: "erc20-transfer",
      qrText:
        "ethereum:0x3333333333333333333333333333333333333333@137/transfer?address=0x1111111111111111111111111111111111111111&uint256=1250000",
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "USDC",
      assetKind: "erc20",
      displayName: "USDC",
      symbol: "USDC",
      amount: "1.25",
      amountBaseUnits: "1250000",
      tokenAddress: "0x3333333333333333333333333333333333333333",
    }
  );
});

test("buildExternalWalletTipQrPayload returns an ERC-20 transfer uri without amount for wallet-side input", () => {
  assert.deepEqual(
    externalWalletTipQrModule.buildExternalWalletTipQrPayload({
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "JPYC",
      amountInput: "",
    }),
    {
      mode: "erc20-transfer",
      qrText:
        "ethereum:0x2222222222222222222222222222222222222222@137/transfer?address=0x1111111111111111111111111111111111111111",
      address: CREATOR_ADDRESS,
      chainId: 137,
      asset: "JPYC",
      assetKind: "erc20",
      displayName: "JPYC",
      symbol: "JPYC",
      amount: null,
      amountBaseUnits: null,
      tokenAddress: "0x2222222222222222222222222222222222222222",
    }
  );
});

test("buildExternalWalletTipDeepLinkHref returns wallet-openable hrefs", () => {
  const addressPayload = externalWalletTipQrModule.buildExternalWalletTipQrPayload({
    address: CREATOR_ADDRESS,
    chainId: 137,
    asset: "NATIVE",
    amountInput: "",
  });
  const tokenPayload = externalWalletTipQrModule.buildExternalWalletTipQrPayload({
    address: CREATOR_ADDRESS,
    chainId: 137,
    asset: "USDC",
    amountInput: "1.25",
  });

  assert.equal(
    externalWalletTipQrModule.buildExternalWalletTipDeepLinkHref(addressPayload),
    `ethereum:${CREATOR_ADDRESS}@137`
  );
  assert.equal(
    externalWalletTipQrModule.buildExternalWalletTipDeepLinkHref(tokenPayload),
    tokenPayload.qrText
  );
});

test("buildExternalWalletTipQrPayload rejects zero values", () => {
  assert.throws(
    () =>
      externalWalletTipQrModule.buildExternalWalletTipQrPayload({
        address: CREATOR_ADDRESS,
        chainId: 137,
        asset: "USDC",
        amountInput: "0",
      }),
    /TIP_AMOUNT_INVALID/
  );
});

test("parseExternalWalletTip helpers use supported fallbacks", () => {
  assert.equal(
    externalWalletTipQrModule.parseExternalWalletTipChainId("999", 137),
    137
  );
  assert.equal(
    externalWalletTipQrModule.parseExternalWalletTipChainId("1", 137),
    1
  );
  assert.equal(
    externalWalletTipQrModule.parseExternalWalletTipAsset("JPYC"),
    "JPYC"
  );
  assert.equal(
    externalWalletTipQrModule.parseExternalWalletTipAsset("unknown"),
    "NATIVE"
  );
});
