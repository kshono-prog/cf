/* components/bridge/BridgeWithICTTButton.tsx */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { isAddress, parseUnits } from "viem";
import type { Address } from "viem";

/**
 * ===== IMPORTANT =====
 * 現状の /bridge/prepare は以下しか返しません:
 *  - bridgeRunId
 *  - snapshotConfirmedTotalAmountDecimal (string)
 *  - source.chainId
 *  - destination.chainId, destination.recipientAddress
 *  - token.address
 *
 * ICTT の send に必要な以下は prepare に含まれていないため、暫定でフロント定数で補います:
 *  - source tokenTransferrerAddress (TokenHome/TokenTransferrer)
 *  - destinationBlockchainId (bytes32)
 *  - destinationTokenTransferrerAddress (TokenRemote/TokenTransferrer)
 *  - requiredGasLimit
 *
 * あとで prepare 側に返却を足す場合は、この定数を不要にできます。
 */

/* -------------------- ICTT placeholders (REPLACE ME) -------------------- */
/**
 * ここはあなたの ICTT 構成に合わせて必ず埋めてください。
 * - source: Polygon の TokenTransferrer (通常 TokenHome 側)
 * - dest:   Avalanche の destinationBlockchainId(bytes32) と destinationTokenTransferrer
 */
const ICTT_PARAMS_BY_CHAIN: Record<
  number,
  {
    // TokenTransferrer on source chain (e.g., Polygon)
    tokenTransferrerAddress: Address;

    // Destination blockchainId (bytes32 hex string)
    destinationBlockchainId: `0x${string}`;

    // TokenTransferrer on destination chain (e.g., Avalanche)
    destinationTokenTransferrerAddress: Address;

    // Teleporter gas limit (protocol-defined / app-defined)
    requiredGasLimit: bigint;

    // token decimals (JPYC: 18 など)
    decimals: number;
  }
> = {
  // Polygon mainnet
  137: {
    tokenTransferrerAddress: "0x0000000000000000000000000000000000000000",
    destinationBlockchainId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    destinationTokenTransferrerAddress:
      "0x0000000000000000000000000000000000000000",
    requiredGasLimit: 250000n,
    decimals: 18,
  },
  // Polygon Amoy
  80002: {
    tokenTransferrerAddress: "0x0000000000000000000000000000000000000000",
    destinationBlockchainId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    destinationTokenTransferrerAddress:
      "0x0000000000000000000000000000000000000000",
    requiredGasLimit: 250000n,
    decimals: 18,
  },
};
/* ---------------------------------------------------------------------- */

type PrepareOk = {
  ok: true;
  prepared: true;
  bridgeRunId: string;
  mode: string;
  currency: "JPYC" | "USDC";
  dryRun: boolean;
  force: boolean;
  snapshotConfirmedTotalAmountDecimal: string;
  source: {
    chainId: number;
    fromAddress: string;
    vaultAddress: string;
  };
  destination: {
    chainId: number;
    recipientAddress: string;
  };
  token: {
    address: string;
  };
  createdAt: string;
};

type PrepareResponse = PrepareOk | { ok: false; error: string };

type RunResponse =
  | { ok: true; saved: true; bridgeRunId: string; bridgeTxHash: `0x${string}` }
  | { ok: false; error: string };

type ReverifyResponse =
  | { ok: true; verified: true; bridgedAt: string; bridgeRunId: string }
  | { ok: true; verified: false; reason?: string }
  | { ok: false; error: string };

/**
 * ICTT TokenTransferrer の send ABI 断片。
 * ※あなたの TokenHome/TokenRemote の ITokenTransferrer.sol と一致させる必要があります。
 */
const ITokenTransferrerAbi = [
  {
    type: "function",
    name: "send",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "input",
        type: "tuple",
        components: [
          { name: "destinationBlockchainId", type: "bytes32" },
          { name: "destinationTokenTransferrerAddress", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "requiredGasLimit", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toBool(v: unknown): boolean {
  return v === true;
}
function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function toAddress(v: unknown): Address | null {
  const s = toString(v);
  if (!s) return null;
  if (!isAddress(s)) return null;
  return s as Address;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function BridgeWithICTTButton(props: {
  projectId: string; // "1"
  currency?: "JPYC" | "USDC"; // UI側で選択している値を渡すなら
  disabled?: boolean;
  onBridged?: () => void; // confirmed後に親がsummary再取得など
}) {
  const { projectId, currency: currencyProp, disabled, onBridged } = props;

  const { address } = useAccount();
  const connectedChainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const canRun = useMemo(() => {
    return !!address && !!walletClient && !busy && !disabled;
  }, [address, walletClient, busy, disabled]);

  const postPrepare = useCallback(async (): Promise<PrepareResponse> => {
    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/bridge/prepare`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          address, // owner check
          currency: currencyProp ?? "JPYC",
          // dryRun/force/note が必要ならここで追加
        }),
      }
    );

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const err = isRecord(json) ? toString(json.error) : null;
      return { ok: false, error: err ?? `HTTP_${res.status}` };
    }

    if (!isRecord(json) || !toBool(json.ok)) {
      return { ok: false, error: "INVALID_RESPONSE" };
    }

    // shape: okJson({ prepared: true, bridgeRunId, ... })
    const prepared = toBool(json.prepared);
    if (!prepared) return { ok: false, error: "NOT_PREPARED" };

    const bridgeRunId = toString(json.bridgeRunId);
    const mode = toString(json.mode) ?? "ICTT_SDK";
    const currency =
      toString(json.currency) === "USDC"
        ? ("USDC" as const)
        : ("JPYC" as const);

    const dryRun = toBool(json.dryRun);
    const force = toBool(json.force);

    const snapshotConfirmedTotalAmountDecimal = toString(
      json.snapshotConfirmedTotalAmountDecimal
    );

    const source = isRecord(json.source) ? json.source : null;
    const destination = isRecord(json.destination) ? json.destination : null;
    const token = isRecord(json.token) ? json.token : null;

    const sourceChainId = source ? toNumber(source.chainId) : null;
    const destinationChainId = destination
      ? toNumber(destination.chainId)
      : null;

    const fromAddress = source ? toString(source.fromAddress) : null;
    const vaultAddress = source ? toString(source.vaultAddress) : null;

    const recipientAddress = destination
      ? toString(destination.recipientAddress)
      : null;

    const tokenAddress = token ? toString(token.address) : null;

    const createdAt = toString(json.createdAt);

    if (
      !bridgeRunId ||
      !snapshotConfirmedTotalAmountDecimal ||
      sourceChainId == null ||
      destinationChainId == null ||
      !fromAddress ||
      vaultAddress == null ||
      !recipientAddress ||
      !tokenAddress ||
      !createdAt
    ) {
      return { ok: false, error: "PREPARE_SHAPE_MISMATCH" };
    }

    // 住所の最低限validate（厳密にやるなら viem isAddress）
    if (!isAddress(recipientAddress)) {
      return { ok: false, error: "PREPARE_RECIPIENT_INVALID" };
    }
    if (!isAddress(tokenAddress)) {
      return { ok: false, error: "PREPARE_TOKEN_INVALID" };
    }

    return {
      ok: true,
      prepared: true,
      bridgeRunId,
      mode,
      currency,
      dryRun,
      force,
      snapshotConfirmedTotalAmountDecimal,
      source: {
        chainId: sourceChainId,
        fromAddress,
        vaultAddress,
      },
      destination: {
        chainId: destinationChainId,
        recipientAddress,
      },
      token: {
        address: tokenAddress,
      },
      createdAt,
    };
  }, [projectId, address, currencyProp]);

  const postRun = useCallback(
    async (
      bridgeRunId: string,
      bridgeTxHash: `0x${string}`
    ): Promise<RunResponse> => {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/bridge/run`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            address, // owner check
            bridgeRunId,
            bridgeTxHash,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const err = isRecord(json) ? toString(json.error) : null;
        return { ok: false, error: err ?? `HTTP_${res.status}` };
      }

      if (!isRecord(json) || !toBool(json.ok)) {
        return { ok: false, error: "INVALID_RESPONSE" };
      }

      // bridge/run はあなたが貼ってくれた版だと okJson({ saved: true, bridgeRunId, bridgeTxHash, ... })
      const saved = toBool(json.saved);
      const savedRunId = toString(json.bridgeRunId);
      const savedHash = toString(json.bridgeTxHash);

      if (!saved || !savedRunId || !savedHash || !savedHash.startsWith("0x")) {
        return { ok: false, error: "RUN_SHAPE_MISMATCH" };
      }

      return {
        ok: true,
        saved: true,
        bridgeRunId: savedRunId,
        bridgeTxHash: savedHash as `0x${string}`,
      };
    },
    [projectId, address]
  );

  const postReverify = useCallback(async (): Promise<ReverifyResponse> => {
    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/bridge/reverify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          address, // owner check
          // reverify は現状「最新の未confirmed run を探す」実装なので bridgeRunId は不要
          // bridgeRunId を使う実装にした場合はここで送る
        }),
      }
    );

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const err = isRecord(json) ? toString(json.error) : null;
      return { ok: false, error: err ?? `HTTP_${res.status}` };
    }

    if (!isRecord(json) || !toBool(json.ok)) {
      return { ok: false, error: "INVALID_RESPONSE" };
    }

    // あなたの reverify 実装: okJson({ verified: true/false, ... })
    const verified = toBool(json.verified);
    if (verified) {
      const bridgedAt = toString(json.bridgedAt) ?? new Date().toISOString();
      const bridgeRunId = toString(json.bridgeRunId) ?? "unknown";
      return { ok: true, verified: true, bridgedAt, bridgeRunId };
    }

    return {
      ok: true,
      verified: false,
      reason: toString(json.reason) ?? undefined,
    };
  }, [projectId, address]);

  const onClick = useCallback(async () => {
    if (!walletClient || !address) return;

    setBusy(true);
    setStatus("");

    try {
      setStatus("ブリッジ準備中…");
      const prep = await postPrepare();
      if (!prep.ok) {
        setStatus(`prepare failed: ${prep.error}`);
        return;
      }

      // source chain チェック（prepareが返した chainId が正）
      if (connectedChainId !== prep.source.chainId) {
        setStatus(
          `ネットワークを source(${prep.source.chainId}) に切り替えてください`
        );
        return;
      }

      // ICTT パラメータ（暫定：フロント定数）
      const p = ICTT_PARAMS_BY_CHAIN[prep.source.chainId];
      if (!p) {
        setStatus("ICTT パラメータが未設定です（source chain 未対応）");
        return;
      }

      // 実際の TokenTransferrer が未設定なら止める（0x00... のまま誤送信しない）
      if (
        p.tokenTransferrerAddress.toLowerCase() ===
          "0x0000000000000000000000000000000000000000" ||
        p.destinationTokenTransferrerAddress.toLowerCase() ===
          "0x0000000000000000000000000000000000000000"
      ) {
        setStatus("ICTT のアドレス定数が未設定です（TokenTransferrer 等）");
        return;
      }

      // amountHuman（DB合計） -> raw
      // prepare では snapshotConfirmedTotalAmountDecimal が "22" / "10" のように返る想定
      const amountRaw = parseUnits(
        prep.snapshotConfirmedTotalAmountDecimal,
        p.decimals
      );

      // recipient は prepare の destination.recipientAddress を使う
      const recipient = prep.destination.recipientAddress as Address;

      setStatus("ウォレットでブリッジを承認してください…");

      // ICTT send input
      const args = [
        {
          destinationBlockchainId: p.destinationBlockchainId,
          destinationTokenTransferrerAddress:
            p.destinationTokenTransferrerAddress,
          recipient,
          amount: amountRaw,
          requiredGasLimit: p.requiredGasLimit,
        },
      ] as const;

      const hash = await walletClient.writeContract({
        address: p.tokenTransferrerAddress,
        abi: ITokenTransferrerAbi,
        functionName: "send",
        args,
        account: address,
      });

      setStatus(`送信済み（tx: ${hash.slice(0, 10)}…）。DBに保存中…`);

      const run = await postRun(prep.bridgeRunId, hash);
      if (!run.ok) {
        setStatus(`bridge/run failed: ${run.error}`);
        return;
      }

      setStatus("宛先チェーンでの着金を確認中…");

      // reverify poll（宛先着金確認）
      // ここは UX 的に「ユーザーに待たせすぎない」程度に短く
      const maxTry = 20;
      const intervalMs = 3000;

      for (let i = 0; i < maxTry; i++) {
        const r = await postReverify();
        if (r.ok && r.verified === true) {
          setStatus(`ブリッジ確定（${r.bridgedAt}）。`);
          onBridged?.();
          return;
        }
        await sleep(intervalMs);
      }

      setStatus(
        "まだ着金確認できていません。時間をおいて再度 Reverify（または Refresh）してください。"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`bridge failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [
    walletClient,
    address,
    connectedChainId,
    postPrepare,
    postRun,
    postReverify,
    onBridged,
  ]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => void onClick()}
        disabled={!canRun}
      >
        ブリッジ実行（ICTT）
      </button>

      {status && (
        <div className="text-xs text-gray-600 break-all">{status}</div>
      )}
    </div>
  );
}
