/* components/bridge/BridgeWithWormholeOrManualButton.tsx */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import type { Address } from "viem";

type Provider = "WORMHOLE_UI" | "MANUAL";
type Currency = "JPYC" | "USDC";

type PrepareOk = {
  ok: true;
  prepared: true;
  provider: Provider;
  bridgeRunId: string;
  currency: Currency;
  snapshotConfirmedTotalAmountDecimal: string | null;

  source: {
    chainId: number;
    fromAddress: string;
    vaultAddress: string;
  };
  destination: {
    chainId: number;
    recipientAddress: Address;
  };
  token: {
    address: Address;
  };
  ui: {
    wormholeUrl: string;
    instruction: string;
    expectTxHashOn: "DESTINATION_CHAIN";
    expectedExplorerHint: string;
  };
  createdAt: string;
};

type PrepareResponse = PrepareOk | { ok: false; error: string };

type RunResponse =
  | { ok: true; saved: true; bridgeRunId: string; bridgeTxHash: `0x${string}` }
  | { ok: false; error: string };

type ReverifyResponse =
  | {
      ok: true;
      verified: true;
      confirmed: true;
      bridgeRunId: string;
      confirmedAt: string;
    }
  | {
      ok: true;
      verified: false;
      confirmed: false;
      reason?: string;
      bridgeRunId?: string;
    }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toBool(v: unknown): boolean {
  return v === true;
}

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toProvider(v: unknown): Provider | null {
  return v === "WORMHOLE_UI" || v === "MANUAL" ? (v as Provider) : null;
}

function toCurrency(v: unknown): Currency | null {
  return v === "JPYC" || v === "USDC" ? (v as Currency) : null;
}

function toAddress(v: unknown): Address | null {
  const s = toString(v);
  if (!s) return null;
  if (!isAddress(s)) return null;
  return s as Address;
}

function toTxHash(v: unknown): `0x${string}` | null {
  const s = toString(v);
  if (!s) return null;
  if (!s.startsWith("0x")) return null;
  // 厳密長チェックは省略（必要なら 66 文字チェック）
  return s as `0x${string}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function BridgeWithWormholeOrManualButton(props: {
  projectId: string; // "1"
  currency: Currency; // 現在選択中の通貨（UIのselectと連動）
  provider?: Provider; // 任意。省略時はWORMHOLE_UI
  disabled?: boolean;
  onBridged?: () => void;
}) {
  const {
    projectId,
    currency,
    provider = "WORMHOLE_UI",
    disabled,
    onBridged,
  } = props;

  const { address, isConnected } = useAccount();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [bridgeRunId, setBridgeRunId] = useState<string>("");
  const [wormholeUrl, setWormholeUrl] = useState<string>("");
  const [instruction, setInstruction] = useState<string>("");
  const [destTxHashInput, setDestTxHashInput] = useState<string>("");

  const canPrepare = useMemo(() => {
    return !!isConnected && !!address && !busy && !disabled;
  }, [isConnected, address, busy, disabled]);

  const canSaveTx = useMemo(() => {
    return !!bridgeRunId && !busy && !!destTxHashInput.trim();
  }, [bridgeRunId, busy, destTxHashInput]);

  const postPrepare = useCallback(async (): Promise<PrepareResponse> => {
    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/bridge/prepare`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          address,
          currency,
          provider,
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

    // shape parse
    const prepared = isRecord(json) ? toBool(json.prepared) : false;
    const prov = toProvider(isRecord(json) ? json.provider : null);
    const runId = toString(isRecord(json) ? json.bridgeRunId : null);
    const cur = toCurrency(isRecord(json) ? json.currency : null);

    const snapshot = toString(
      isRecord(json) ? json.snapshotConfirmedTotalAmountDecimal : null
    );

    const src = isRecord(json.source) ? json.source : null;
    const dst = isRecord(json.destination) ? json.destination : null;
    const tok = isRecord(json.token) ? json.token : null;
    const ui = isRecord(json.ui) ? json.ui : null;

    const srcChainId = src ? toNumber(src.chainId) : null;
    const fromAddress = src ? toString(src.fromAddress) : null;
    const vaultAddress = src ? toString(src.vaultAddress) : null;

    const dstChainId = dst ? toNumber(dst.chainId) : null;
    const recipientAddress = dst ? toAddress(dst.recipientAddress) : null;

    const tokenAddress = tok ? toAddress(tok.address) : null;

    const wormhole = ui ? toString(ui.wormholeUrl) : null;
    const inst = ui ? toString(ui.instruction) : null;
    const expectTxHashOn = ui ? toString(ui.expectTxHashOn) : null;
    const explorerHint = ui ? toString(ui.expectedExplorerHint) : null;

    const createdAt = toString(isRecord(json) ? json.createdAt : null);

    if (
      !prepared ||
      !prov ||
      !runId ||
      !cur ||
      srcChainId == null ||
      !fromAddress ||
      vaultAddress == null ||
      dstChainId == null ||
      !recipientAddress ||
      !tokenAddress ||
      !wormhole ||
      !inst ||
      expectTxHashOn !== "DESTINATION_CHAIN" ||
      !explorerHint ||
      !createdAt
    ) {
      return { ok: false, error: "PREPARE_SHAPE_MISMATCH" };
    }

    const ok: PrepareOk = {
      ok: true,
      prepared: true,
      provider: prov,
      bridgeRunId: runId,
      currency: cur,
      snapshotConfirmedTotalAmountDecimal: snapshot,
      source: { chainId: srcChainId, fromAddress, vaultAddress },
      destination: { chainId: dstChainId, recipientAddress },
      token: { address: tokenAddress },
      ui: {
        wormholeUrl: wormhole,
        instruction: inst,
        expectTxHashOn: "DESTINATION_CHAIN",
        expectedExplorerHint: explorerHint,
      },
      createdAt,
    };

    return ok;
  }, [projectId, address, currency, provider]);

  const postRun = useCallback(
    async (
      runId: string,
      bridgeTxHash: `0x${string}`
    ): Promise<RunResponse> => {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/bridge/run`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            address,
            bridgeRunId: runId,
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

      const saved = toBool(json.saved);
      const savedRunId = toString(json.bridgeRunId);
      const savedTxHash = toTxHash(json.bridgeTxHash);

      if (!saved || !savedRunId || !savedTxHash) {
        return { ok: false, error: "RUN_SHAPE_MISMATCH" };
      }

      return {
        ok: true,
        saved: true,
        bridgeRunId: savedRunId,
        bridgeTxHash: savedTxHash,
      };
    },
    [projectId, address]
  );

  const postReverify = useCallback(
    async (runId: string): Promise<ReverifyResponse> => {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/bridge/reverify`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            address,
            bridgeRunId: runId,
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

      const verified = toBool(json.verified);
      const confirmed = toBool(json.confirmed);

      if (verified && confirmed) {
        const confirmedAt =
          toString(json.confirmedAt) ?? new Date().toISOString();
        const bridgeRunId2 = toString(json.bridgeRunId) ?? runId;
        return {
          ok: true,
          verified: true,
          confirmed: true,
          bridgeRunId: bridgeRunId2,
          confirmedAt,
        };
      }

      return {
        ok: true,
        verified: false,
        confirmed: false,
        reason: toString(json.reason) ?? undefined,
        bridgeRunId: toString(json.bridgeRunId) ?? undefined,
      };
    },
    [projectId, address]
  );

  const onPrepareClick = useCallback(async () => {
    if (!address) return;
    setBusy(true);
    setStatus("");
    setBridgeRunId("");
    setWormholeUrl("");
    setInstruction("");
    setDestTxHashInput("");

    try {
      setStatus("ブリッジ準備中…");
      const prep = await postPrepare();
      if (!prep.ok) {
        setStatus(`prepare failed: ${prep.error}`);
        return;
      }

      setBridgeRunId(prep.bridgeRunId);
      setWormholeUrl(prep.ui.wormholeUrl);
      setInstruction(prep.ui.instruction);

      if (prep.provider === "WORMHOLE_UI") {
        setStatus(
          "Wormhole UI を開きます。完了後、Avalanche 側の着金 txHash を貼ってください。"
        );
        window.open(prep.ui.wormholeUrl, "_blank", "noopener,noreferrer");
      } else {
        setStatus(
          "手動でブリッジしてください。完了後、Avalanche 側の着金 txHash を貼ってください。"
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`prepare failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [address, postPrepare]);

  const onSaveAndVerifyClick = useCallback(async () => {
    if (!address) return;
    const runId = bridgeRunId;
    if (!runId) return;

    const tx = toTxHash(destTxHashInput.trim());
    if (!tx) {
      setStatus("txHash が不正です（0x... を貼ってください）");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      setStatus("txHash をDBに保存中…");
      const run = await postRun(runId, tx);
      if (!run.ok) {
        setStatus(`bridge/run failed: ${run.error}`);
        return;
      }

      setStatus("Avalanche 側の着金を検証中…");

      const maxTry = 20;
      const intervalMs = 3000;

      for (let i = 0; i < maxTry; i++) {
        const r = await postReverify(runId);
        if (r.ok && r.verified === true && r.confirmed === true) {
          setStatus(`BRIDGED 確定（${r.confirmedAt}）。`);
          onBridged?.();
          return;
        }
        await sleep(intervalMs);
      }

      setStatus(
        "まだ着金確認できていません。少し時間をおいて再度 Verify を押してください。"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`verify failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [address, bridgeRunId, destTxHashInput, postRun, postReverify, onBridged]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => void onPrepareClick()}
        disabled={!canPrepare}
        title={!isConnected ? "ウォレット接続が必要です" : ""}
      >
        {provider === "WORMHOLE_UI"
          ? "ブリッジ開始（Wormhole UI）"
          : "ブリッジ開始（Manual）"}
      </button>

      {bridgeRunId ? (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-xs text-gray-600">
            <div className="font-semibold">BridgeRunId</div>
            <div className="font-mono break-all">{bridgeRunId}</div>
          </div>

          {instruction ? (
            <div className="text-xs text-gray-600">{instruction}</div>
          ) : null}

          {wormholeUrl && provider === "WORMHOLE_UI" ? (
            <a
              className="text-xs underline text-blue-600 break-all"
              href={wormholeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {wormholeUrl}
            </a>
          ) : null}

          <div className="space-y-1">
            <div className="text-xs text-gray-500">
              Avalanche 側の着金 txHash（Snowtrace で確認できる tx）
            </div>
            <input
              className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
              value={destTxHashInput}
              onChange={(e) => setDestTxHashInput(e.target.value)}
              placeholder="0x..."
              disabled={busy}
            />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => void onSaveAndVerifyClick()}
            disabled={!canSaveTx}
          >
            txHash 保存 → 着金検証（BRIDGED確定）
          </button>
        </div>
      ) : null}

      {status ? (
        <div className="text-xs text-gray-600 break-all">{status}</div>
      ) : null}
    </div>
  );
}
