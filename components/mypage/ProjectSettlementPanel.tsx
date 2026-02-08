"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, isHash } from "viem";
import { useChainId } from "wagmi";

type SettlementStatus =
  | "NOT_READY"
  | "BRIDGING"
  | "READY_FOR_DISTRIBUTION"
  | "DISTRIBUTED";

type BridgeStep = {
  id: string;
  sourceChain: "POLYGON" | "ETHEREUM";
  destinationChain: "AVALANCHE";
  token: "JPYC" | "USDC";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  bridgedAmountAtomic: string;
  txHash: string | null;
  completedAt: string | null;
  memo: string | null;
};

type DistributionEntry = {
  id: string;
  recipientAddressChecksum: string;
  token: "JPYC" | "USDC";
  amountAtomic: string;
  memo: string | null;
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  txHash: string | null;
  sentAt: string | null;
  orderIndex: number;
};

type SettlementView = {
  status: SettlementStatus;
  bridgedTotalAtomic: string;
  distributedTotalAtomic: string;
};

type DistributionDraft = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: "JPYC" | "USDC";
};

function asErrorCode(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const e = (json as { error?: unknown }).error;
    if (typeof e === "string" && e.length > 0) return e;
  }
  return fallback;
}

function formatChainName(source: "POLYGON" | "ETHEREUM"): string {
  return source === "POLYGON" ? "Polygon" : "Ethereum";
}

function statusBadgeClass(status: SettlementStatus): string {
  if (status === "READY_FOR_DISTRIBUTION") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "DISTRIBUTED") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (status === "BRIDGING") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function makeEmptyRow(): DistributionDraft {
  return {
    recipientAddress: "",
    amountAtomic: "",
    memo: "",
    token: "JPYC",
  };
}

export function ProjectSettlementPanel(props: {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
}) {
  const chainId = useChainId();
  const { projectId, walletAddress, isConnected } = props;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [bridgeSteps, setBridgeSteps] = useState<BridgeStep[]>([]);
  const [entries, setEntries] = useState<DistributionEntry[]>([]);

  const [rows, setRows] = useState<DistributionDraft[]>([makeEmptyRow()]);

  const [bridgeAmountPolygon, setBridgeAmountPolygon] = useState("");
  const [bridgeTxPolygon, setBridgeTxPolygon] = useState("");
  const [bridgeAmountEthereum, setBridgeAmountEthereum] = useState("");
  const [bridgeTxEthereum, setBridgeTxEthereum] = useState("");

  const canUse = !!projectId;

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSettlement(null);
      setBridgeSteps([]);
      setEntries([]);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement`,
        { cache: "no-store" }
      );
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      if (!json || typeof json !== "object") {
        setMessage("SETTLEMENT_RESPONSE_INVALID");
        return;
      }

      const ok = (json as { ok?: unknown }).ok;
      if (ok !== true) {
        setMessage(asErrorCode(json, "SETTLEMENT_RESPONSE_INVALID"));
        return;
      }

      const s = (json as { settlement?: SettlementView }).settlement;
      const b = (json as { bridgeSteps?: BridgeStep[] }).bridgeSteps;
      const d = (json as { distributionEntries?: DistributionEntry[] })
        .distributionEntries;

      if (!s || !Array.isArray(b) || !Array.isArray(d)) {
        setMessage("SETTLEMENT_RESPONSE_INVALID");
        return;
      }

      setSettlement(s);
      setBridgeSteps(b);
      setEntries(d);

      const editableRows = d
        .filter((x) => x.status !== "SENT")
        .map((x) => ({
          id: x.id,
          recipientAddress: x.recipientAddressChecksum,
          amountAtomic: x.amountAtomic,
          memo: x.memo ?? "",
          token: x.token,
        }));
      setRows(editableRows.length > 0 ? editableRows : [makeEmptyRow()]);
    } catch {
      setMessage("SETTLEMENT_FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const planned = rows.reduce((acc, row) => {
      const n = Number(row.amountAtomic);
      if (!Number.isFinite(n) || n <= 0) return acc;
      return acc + n;
    }, 0);

    const bridged = Number(settlement?.bridgedTotalAtomic ?? "0");
    return {
      planned,
      bridged,
      exceeds: Number.isFinite(bridged) && planned > bridged,
    };
  }, [rows, settlement?.bridgedTotalAtomic]);

  const walletNotice = !isConnected
    ? "ウォレット未接続です"
    : chainId !== 43114
    ? "Avalanche C-Chain(43114)に切り替えてください"
    : null;

  async function recordBridge(sourceChain: "POLYGON" | "ETHEREUM") {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    const amount = sourceChain === "POLYGON" ? bridgeAmountPolygon : bridgeAmountEthereum;
    const txHash = sourceChain === "POLYGON" ? bridgeTxPolygon.trim() : bridgeTxEthereum.trim();

    if (!/^\d+$/.test(amount) || amount === "0") {
      setMessage("BRIDGED_AMOUNT_INVALID");
      return;
    }

    if (txHash && !isHash(txHash)) {
      setMessage("TX_HASH_INVALID");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/bridge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            sourceChain,
            token: "JPYC",
            bridgedAmountAtomic: amount,
            txHash: txHash || undefined,
            completedAt: new Date().toISOString(),
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage(`${formatChainName(sourceChain)} bridge を記録しました`);
      await refresh();
    } catch {
      setMessage("BRIDGE_RECORD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DistributionDraft>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function saveDistributions() {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    for (const row of rows) {
      if (!isAddress(row.recipientAddress)) {
        setMessage("RECIPIENT_ADDRESS_INVALID");
        return;
      }
      if (!/^\d+$/.test(row.amountAtomic) || row.amountAtomic === "0") {
        setMessage("AMOUNT_INVALID");
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload = rows.map((row, index) => ({
        id: row.id,
        recipientAddress: getAddress(row.recipientAddress),
        amountAtomic: row.amountAtomic,
        memo: row.memo.trim() || undefined,
        token: row.token,
        orderIndex: index,
      }));

      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/distributions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            entries: payload,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage("Distribution下書きを保存しました");
      await refresh();
    } catch {
      setMessage("DISTRIBUTION_SAVE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function markEntryResult(
    entry: DistributionEntry,
    status: "SENT" | "FAILED"
  ) {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    const txHash = window.prompt(
      status === "SENT" ? "txHashを入力してください" : "失敗時はtxHash任意です",
      entry.txHash ?? ""
    );

    if (status === "SENT") {
      if (!txHash || !isHash(txHash.trim())) {
        setMessage("TX_HASH_REQUIRED_FOR_SENT");
        return;
      }
    } else if (txHash && !isHash(txHash.trim())) {
      setMessage("TX_HASH_INVALID");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/distribution-result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            entryId: entry.id,
            status,
            txHash: txHash?.trim() || undefined,
            errorReason: status === "FAILED" ? "MANUAL_MARKED_FAILED" : undefined,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage(status === "SENT" ? "送信済みに更新しました" : "失敗として更新しました");
      await refresh();
    } catch {
      setMessage("DISTRIBUTION_RESULT_SAVE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function recompute() {
    if (!projectId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "RECOMPUTE" }),
        }
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }
      await refresh();
      setMessage("settlement status を再計算しました");
    } catch {
      setMessage("SETTLEMENT_RECOMPUTE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  if (!canUse) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        Projectを作成すると、Bridge/Distribution設定が表示されます。
      </div>
    );
  }

  const polygonDone = bridgeSteps.some(
    (x) => x.sourceChain === "POLYGON" && x.status === "COMPLETED"
  );
  const ethereumDone = bridgeSteps.some(
    (x) => x.sourceChain === "ETHEREUM" && x.status === "COMPLETED"
  );

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <div className="font-semibold">Settlement (Bridge → Distribution)</div>
          <div className="text-xs text-gray-500 mt-1">
            本UIは資金を保管しません。送金・ブリッジは必ずユーザー自身のウォレットで実行されます。
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs border px-2 py-1 rounded ${statusBadgeClass(settlement?.status ?? "NOT_READY")}`}>
            {settlement?.status ?? "NOT_READY"}
          </span>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => void recompute()}
            disabled={loading}
          >
            Recompute
          </button>
        </div>
      </div>

      {walletNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2">
          {walletNotice}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 px-3 py-2">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Polygon → Avalanche</div>
          <a
            href="https://core.app/bridge/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 underline"
          >
            Open official bridge
          </a>
          <div className="text-xs">状態: {polygonDone ? "COMPLETED" : "PENDING"}</div>
          <input
            className="w-full rounded border px-2 py-1.5 text-xs"
            placeholder="bridgedAmountAtomic"
            value={bridgeAmountPolygon}
            onChange={(e) => setBridgeAmountPolygon(e.target.value)}
            inputMode="numeric"
          />
          <input
            className="w-full rounded border px-2 py-1.5 text-xs font-mono"
            placeholder="txHash (optional)"
            value={bridgeTxPolygon}
            onChange={(e) => setBridgeTxPolygon(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black text-white px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void recordBridge("POLYGON")}
            disabled={loading || !walletAddress}
          >
            完了を記録
          </button>
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Ethereum → Avalanche</div>
          <a
            href="https://core.app/bridge/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 underline"
          >
            Open official bridge
          </a>
          <div className="text-xs">状態: {ethereumDone ? "COMPLETED" : "PENDING"}</div>
          <input
            className="w-full rounded border px-2 py-1.5 text-xs"
            placeholder="bridgedAmountAtomic"
            value={bridgeAmountEthereum}
            onChange={(e) => setBridgeAmountEthereum(e.target.value)}
            inputMode="numeric"
          />
          <input
            className="w-full rounded border px-2 py-1.5 text-xs font-mono"
            placeholder="txHash (optional)"
            value={bridgeTxEthereum}
            onChange={(e) => setBridgeTxEthereum(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black text-white px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void recordBridge("ETHEREUM")}
            disabled={loading || !walletAddress}
          >
            完了を記録
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Distribution entries</div>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => setRows((prev) => [...prev, makeEmptyRow()])}
            disabled={loading}
          >
            行を追加
          </button>
        </div>

        <div className="text-xs text-gray-600">
          合計: {totals.planned} / Bridge済み: {totals.bridged}
          {totals.exceeds ? (
            <span className="text-rose-700 ml-2">(超過しています)</span>
          ) : null}
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={`${row.id ?? "new"}-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2">
              <input
                className="md:col-span-4 rounded border px-2 py-1.5 text-xs font-mono"
                placeholder="recipientAddress"
                value={row.recipientAddress}
                onChange={(e) => updateDraft(i, { recipientAddress: e.target.value })}
              />
              <input
                className="md:col-span-2 rounded border px-2 py-1.5 text-xs"
                placeholder="amountAtomic"
                value={row.amountAtomic}
                onChange={(e) => updateDraft(i, { amountAtomic: e.target.value })}
                inputMode="numeric"
              />
              <select
                className="md:col-span-2 rounded border px-2 py-1.5 text-xs"
                value={row.token}
                onChange={(e) => updateDraft(i, { token: e.target.value as "JPYC" | "USDC" })}
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                className="md:col-span-3 rounded border px-2 py-1.5 text-xs"
                placeholder="memo"
                value={row.memo}
                onChange={(e) => updateDraft(i, { memo: e.target.value })}
              />
              <button
                type="button"
                className="md:col-span-1 rounded border px-2 py-1.5 text-xs"
                onClick={() =>
                  setRows((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void saveDistributions()}
          disabled={loading || !walletAddress || totals.exceeds}
        >
          Distribution下書きを保存
        </button>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-sm font-medium">送信結果の記録（行単位）</div>
        {entries.length === 0 ? (
          <div className="text-xs text-gray-500">まだ配分行がありません。</div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border rounded p-2 text-xs">
                <span className="font-mono">{e.recipientAddressChecksum}</span>
                <span>{e.amountAtomic}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100">{e.status}</span>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => void markEntryResult(e, "SENT")}
                  disabled={loading || e.status === "SENT"}
                >
                  SENT
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => void markEntryResult(e, "FAILED")}
                  disabled={loading}
                >
                  FAILED
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
