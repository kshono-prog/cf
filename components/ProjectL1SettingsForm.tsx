/* components/projects/ProjectL1SettingsForm.tsx */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * ProjectL1SettingsForm.tsx（完成版・全量）
 * - 追加フィールド（blockchainId / teleporter / ictt）まで含めた入力欄
 * - 審査員向け「見える化カード」（AuditCard / ProgressHintPanel / BridgeDebugPanel）統合済み
 * - /l1 GET/PATCH と /bridge POST を呼び出す
 * - any なし（unknown + 型ガード）
 *
 * 前提:
 * - /api/projects/[id]/l1 : GET { ok:true, project:{...} } / PATCH { ok:true, project:{...} }
 * - /api/projects/[id]/bridge : POST { ok:true, mode:"READ_ONCHAIN", auditCard?, progressHint?, l1? } など
 */

// ---------------------------
// Props
// ---------------------------
type ProjectL1SettingsFormProps = {
  projectId: string; // "2" など
  defaultCurrency?: "JPYC"; // デモ優先で固定してもよい
};

// ---------------------------
// Runtime guards
// ---------------------------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toStringOrUndefined(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function toNumberOrUndefined(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toNullableStringOrNull(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function toNullableNumberOrNull(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function isHexAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

function isBytes32Hex(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

function normalizeNullIfEmpty(s: string | null): string | null {
  if (s === null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizeLowerHexOrNull(s: string | null): string | null {
  const t = normalizeNullIfEmpty(s);
  return t === null ? null : t.toLowerCase();
}

function normalizeAddressOrThrow(
  s: string | null,
  code: string
): string | null {
  const t = normalizeNullIfEmpty(s);
  if (t === null) return null;
  if (!isHexAddress(t)) throw new Error(code);
  return t.toLowerCase();
}

function normalizeBytes32OrThrow(
  s: string | null,
  code: string
): string | null {
  const t = normalizeNullIfEmpty(s);
  if (t === null) return null;
  if (!isBytes32Hex(t)) throw new Error(code);
  return t.toLowerCase();
}

function normalizeChainIdOrThrow(
  n: number | null,
  code: string
): number | null {
  if (n === null) return null;
  const v = Math.trunc(n);
  if (!Number.isFinite(v) || v < 0) throw new Error(code);
  return v;
}

// ---------------------------
// UI-facing types
// ---------------------------
type ProjectL1View = {
  id: string;
  title: string;
  status: string;

  // existing L1 fields
  eventFundingChainId: number | null;
  eventFundingSourceAddress: string | null;
  eventVaultAddress: string | null;
  liquidityChainId: number | null;
  liquidityRecipientAddress: string | null;

  // route A saved-only
  eventBlockchainId: string | null;
  liquidityBlockchainId: string | null;
  teleporterMessenger: string | null;
  icttTokenAddress: string | null;
  icttTokenHome: string | null;
  icttTokenRemote: string | null;

  createdAt: string;
  updatedAt: string;
};

type L1ConfigView = {
  // Event side
  eventFundingChainId: number | null;
  eventFundingSourceAddress: string | null;
  eventVaultAddress: string | null;

  // Liquidity side
  liquidityChainId: number | null;
  liquidityRecipientAddress: string | null;

  // Route A (saved only)
  eventBlockchainId: string | null;
  liquidityBlockchainId: string | null;
  teleporterMessenger: string | null;
  icttTokenAddress: string | null;
  icttTokenHome: string | null;
  icttTokenRemote: string | null;
};

type BalanceView = { raw: string; formatted: string };

type ProgressHintView = {
  dbConfirmedTotalInt?: number;
  dbConfirmedTotalAmountDecimal?: string;
  note?: string;
};

type BridgeDebugView = {
  ok: boolean;
  mode?: string;
  error?: string;
  l1?: {
    eventFunding?: {
      chainId?: number;
      source?: string;
      vault?: string;
      token?: string;
      balance?: BalanceView;
    };
    liquidity?: {
      chainId?: number;
      recipient?: string;
      token?: string;
      balance?: BalanceView;
    };
  };
  progressHint?: ProgressHintView;
  auditCard?: unknown;
};

type AuditCardView = {
  currency: string;
  vault: BalanceView | null;
  recipient: BalanceView | null;
  dbConfirmedTotalInt: number | null;
  dbConfirmedTotalAmountDecimal: string | null;
  diffHuman: string | null; // allow "N/A"
  diffRaw: string | null; // allow "N/A"
};

function toOptionalBalanceView(v: unknown): BalanceView | null {
  if (!isRecord(v)) return null;
  const raw = toStringOrUndefined(v.raw);
  const formatted = toStringOrUndefined(v.formatted);
  if (typeof raw !== "string" || typeof formatted !== "string") return null;
  return { raw, formatted };
}

function buildAuditCardView(params: {
  currency: string;
  auditCardFromApi?: unknown;
  l1FromApi?: unknown;
  progressHintFromApi?: unknown;
}): AuditCardView {
  const { currency, auditCardFromApi, l1FromApi, progressHintFromApi } = params;

  // auditCard があれば優先（ただし必要最低限のみ抽出）
  if (isRecord(auditCardFromApi)) {
    const vault = toOptionalBalanceView(auditCardFromApi.vault);
    const recipient = toOptionalBalanceView(auditCardFromApi.recipient);

    const dbInt =
      typeof auditCardFromApi.dbConfirmedTotalInt === "number" &&
      Number.isFinite(auditCardFromApi.dbConfirmedTotalInt)
        ? auditCardFromApi.dbConfirmedTotalInt
        : null;

    const dbDec =
      toStringOrUndefined(auditCardFromApi.dbConfirmedTotalAmountDecimal) ??
      null;
    const diffHuman = toStringOrUndefined(auditCardFromApi.diffHuman) ?? null;
    const diffRaw = toStringOrUndefined(auditCardFromApi.diffRaw) ?? null;

    return {
      currency,
      vault,
      recipient,
      dbConfirmedTotalInt: dbInt,
      dbConfirmedTotalAmountDecimal: dbDec,
      diffHuman,
      diffRaw,
    };
  }

  // なければ合成
  const l1 = isRecord(l1FromApi) ? l1FromApi : null;
  const eventFunding = l1 && isRecord(l1.eventFunding) ? l1.eventFunding : null;
  const liquidity = l1 && isRecord(l1.liquidity) ? l1.liquidity : null;

  const vaultBal = eventFunding
    ? toOptionalBalanceView(eventFunding.balance)
    : null;
  const recipientBal = liquidity
    ? toOptionalBalanceView(liquidity.balance)
    : null;

  const hint = isRecord(progressHintFromApi) ? progressHintFromApi : null;
  const dbInt =
    hint &&
    typeof hint.dbConfirmedTotalInt === "number" &&
    Number.isFinite(hint.dbConfirmedTotalInt)
      ? hint.dbConfirmedTotalInt
      : null;
  const dbDec = hint
    ? toStringOrUndefined(hint.dbConfirmedTotalAmountDecimal) ?? null
    : null;

  // 差分（デモ優先で human のみ可能なら算出、raw は N/A）
  let diffHuman: string | null = "N/A";
  let diffRaw: string | null = "N/A";

  try {
    if (recipientBal && typeof dbInt === "number") {
      const onChainHuman = Number(recipientBal.formatted);
      if (Number.isFinite(onChainHuman))
        diffHuman = String(onChainHuman - dbInt);
    }
  } catch {
    diffHuman = "N/A";
    diffRaw = "N/A";
  }

  return {
    currency,
    vault: vaultBal,
    recipient: recipientBal,
    dbConfirmedTotalInt: dbInt,
    dbConfirmedTotalAmountDecimal: dbDec,
    diffHuman,
    diffRaw,
  };
}

// ---------------------------
// API parse helpers
// ---------------------------
type L1GetOk = { ok: true; project: ProjectL1View };
type L1GetNg = { ok: false; error: string };
type L1GetRes = L1GetOk | L1GetNg;

function parseProjectL1View(raw: unknown): ProjectL1View | null {
  if (!isRecord(raw)) return null;

  const id = toStringOrUndefined(raw.id);
  const title = toStringOrUndefined(raw.title);
  const status = toStringOrUndefined(raw.status);
  const createdAt = toStringOrUndefined(raw.createdAt);
  const updatedAt = toStringOrUndefined(raw.updatedAt);

  if (!id || !title || !status || !createdAt || !updatedAt) return null;

  const n = (v: unknown): number | null => {
    const nn = toNullableNumberOrNull(v);
    return typeof nn === "undefined" ? null : nn;
  };
  const s = (v: unknown): string | null => {
    const ss = toNullableStringOrNull(v);
    return typeof ss === "undefined" ? null : ss;
  };

  return {
    id,
    title,
    status,

    eventFundingChainId: n(raw.eventFundingChainId),
    eventFundingSourceAddress: s(raw.eventFundingSourceAddress),
    eventVaultAddress: s(raw.eventVaultAddress),
    liquidityChainId: n(raw.liquidityChainId),
    liquidityRecipientAddress: s(raw.liquidityRecipientAddress),

    eventBlockchainId: s(raw.eventBlockchainId),
    liquidityBlockchainId: s(raw.liquidityBlockchainId),
    teleporterMessenger: s(raw.teleporterMessenger),
    icttTokenAddress: s(raw.icttTokenAddress),
    icttTokenHome: s(raw.icttTokenHome),
    icttTokenRemote: s(raw.icttTokenRemote),

    createdAt,
    updatedAt,
  };
}

function parseL1GetResponse(raw: unknown): L1GetRes | null {
  if (!isRecord(raw)) return null;
  const ok = raw.ok;
  if (ok === true) {
    const p = parseProjectL1View(raw.project);
    if (!p) return null;
    return { ok: true, project: p };
  }
  if (ok === false) {
    const err = toStringOrUndefined(raw.error) ?? "UNKNOWN_ERROR";
    return { ok: false, error: err };
  }
  return null;
}

function parseBridgeResponse(raw: unknown): BridgeDebugView | null {
  if (!isRecord(raw)) return null;

  // /bridge は ok を返さない実装もあり得るので、error/ok を両対応
  const okFlag = raw.ok;
  const error = toStringOrUndefined(raw.error);
  const mode = toStringOrUndefined(raw.mode);

  const ok =
    okFlag === true
      ? true
      : okFlag === false
      ? false
      : typeof error === "string"
      ? false
      : true;

  const out: BridgeDebugView = {
    ok,
    mode,
    error,
  };

  if (isRecord(raw.progressHint)) {
    const ph: ProgressHintView = {};
    const di = toNumberOrUndefined(raw.progressHint.dbConfirmedTotalInt);
    const dd = toStringOrUndefined(
      raw.progressHint.dbConfirmedTotalAmountDecimal
    );
    const note = toStringOrUndefined(raw.progressHint.note);
    if (typeof di === "number") ph.dbConfirmedTotalInt = di;
    if (typeof dd === "string") ph.dbConfirmedTotalAmountDecimal = dd;
    if (typeof note === "string") ph.note = note;
    out.progressHint = ph;
  }

  // l1 (optional)
  if (isRecord(raw.l1)) {
    const l1: BridgeDebugView["l1"] = {};
    if (isRecord(raw.l1.eventFunding)) {
      l1.eventFunding = {
        chainId: toNumberOrUndefined(raw.l1.eventFunding.chainId),
        source: toStringOrUndefined(raw.l1.eventFunding.source),
        vault: toStringOrUndefined(raw.l1.eventFunding.vault),
        token: toStringOrUndefined(raw.l1.eventFunding.token),
        balance:
          toOptionalBalanceView(raw.l1.eventFunding.balance) ?? undefined,
      };
    }
    if (isRecord(raw.l1.liquidity)) {
      l1.liquidity = {
        chainId: toNumberOrUndefined(raw.l1.liquidity.chainId),
        recipient: toStringOrUndefined(raw.l1.liquidity.recipient),
        token: toStringOrUndefined(raw.l1.liquidity.token),
        balance: toOptionalBalanceView(raw.l1.liquidity.balance) ?? undefined,
      };
    }
    out.l1 = l1;
  }

  // auditCard は unknown のまま保持（UI で buildAuditCardView が必要最小限抽出）
  if ("auditCard" in raw) out.auditCard = raw.auditCard;

  return out;
}

// ---------------------------
// UI primitives
// ---------------------------
function SectionTitle(props: {
  title: string;
  description?: string;
  note?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">{props.title}</div>
      {props.description ? (
        <div className="text-sm text-gray-600">{props.description}</div>
      ) : null}
      {props.note ? (
        <div className="text-xs text-gray-500">{props.note}</div>
      ) : null}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  note?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{props.label}</div>
      {props.note ? (
        <div className="text-xs text-gray-500">{props.note}</div>
      ) : null}
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function FieldNumber(props: {
  label: string;
  value: string; // keep as string in UI
  placeholder?: string;
  onChange: (v: string) => void;
  note?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{props.label}</div>
      {props.note ? (
        <div className="text-xs text-gray-500">{props.note}</div>
      ) : null}
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        value={props.value}
        placeholder={props.placeholder}
        inputMode="numeric"
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function KeyValueRow(props: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{props.label}</div>
        {props.note ? (
          <div className="text-xs text-gray-500">{props.note}</div>
        ) : null}
      </div>
      <div className="text-sm text-gray-900 text-right break-all">
        {props.value}
      </div>
    </div>
  );
}

function DualValue(props: {
  humanLabel: string;
  human: string | null;
  rawLabel: string;
  raw: string | null;
}) {
  return (
    <div className="space-y-1 text-right">
      <div className="text-xs text-gray-500">{props.humanLabel}</div>
      <div className="text-sm font-medium break-all">
        {props.human ?? "N/A"}
      </div>
      <div className="text-xs text-gray-500 mt-2">{props.rawLabel}</div>
      <div className="text-sm break-all">{props.raw ?? "N/A"}</div>
    </div>
  );
}

// ---------------------------
// Components: AuditCard / ProgressHintPanel / BridgeDebugPanel / Actions
// ---------------------------
function AuditCard(props: {
  projectTitle: string;
  projectStatus: string;
  bridgeOkText: string;
  currency: string;
  audit: AuditCardView;
}) {
  const a = props.audit;

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">プロジェクト</div>
          <div className="text-base font-semibold break-words">
            {props.projectTitle}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">status</div>
          <div className="text-sm font-semibold">{props.projectStatus}</div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        <div className="text-xs text-gray-500">/bridge 結果</div>
        <div className="text-sm font-medium">{props.bridgeOkText}</div>
      </div>

      <div className="space-y-2">
        <div className="text-base font-semibold">監査カード（審査員向け）</div>
        <div className="text-sm text-gray-600">
          Vault 残高 / Recipient 残高 / DB 合計 / 差分 を並べて表示します。
        </div>

        <div className="flex items-center justify-between py-2 border-t">
          <div className="text-sm font-medium">currency</div>
          <div className="text-sm font-semibold">{props.currency}</div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm font-semibold">Vault 残高</div>
              <DualValue
                humanLabel="表示（human）"
                human={a.vault?.formatted ?? null}
                rawLabel="raw（最小単位）"
                raw={a.vault?.raw ?? null}
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm font-semibold">Recipient 残高</div>
              <DualValue
                humanLabel="表示（human）"
                human={a.recipient?.formatted ?? null}
                rawLabel="raw（最小単位）"
                raw={a.recipient?.raw ?? null}
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm font-semibold">DB 合計（CONFIRMED）</div>
              <DualValue
                humanLabel="表示（int）"
                human={
                  a.dbConfirmedTotalInt === null
                    ? null
                    : String(a.dbConfirmedTotalInt)
                }
                rawLabel="raw（DB）"
                raw={a.dbConfirmedTotalAmountDecimal ?? null}
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm font-semibold">差分（on-chain − DB）</div>
              <DualValue
                humanLabel="差分（human）"
                human={a.diffHuman}
                rawLabel="差分（raw）"
                raw={a.diffRaw}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-2">
          <div className="text-sm font-semibold">差分の解釈</div>
          <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
            <li>
              0
              の場合：DBで確認済みの合計と、チェーン上の残高が整合している状態です。
            </li>
            <li>
              N/A の場合：単位の違い等で raw
              同士の比較ができないため、差分は参考値です。
            </li>
            <li>
              ※ on-chain 残高は、資金移動（vault経由/直接送付等）により DB
              と一致しない場合があります。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProgressHintPanel(props: { progressHint: ProgressHintView | null }) {
  const noteDefault =
    "dbConfirmedTotal is the sum of verified Transfer logs. On-chain balances may differ depending on how funds are moved.";

  const hint = props.progressHint;

  return (
    <details className="rounded-2xl border bg-white shadow-sm p-4">
      <summary className="cursor-pointer select-none">
        <div className="text-base font-semibold">検算情報（progressHint）</div>
        <div className="text-sm text-gray-600 mt-1">
          DB 集計の内訳と注意点（Transfer log 検証の合計など）を表示します。
        </div>
      </summary>

      <div className="mt-4 divide-y">
        <KeyValueRow
          label="dbConfirmedTotalInt"
          value={
            typeof hint?.dbConfirmedTotalInt === "number"
              ? String(hint.dbConfirmedTotalInt)
              : "N/A"
          }
        />
        <KeyValueRow
          label="dbConfirmedTotalAmountDecimal"
          value={hint?.dbConfirmedTotalAmountDecimal ?? "N/A"}
        />
        <KeyValueRow label="note" value={hint?.note ?? noteDefault} />
      </div>
    </details>
  );
}

function BridgeDebugPanel(props: {
  l1: L1ConfigView;
  bridgeRaw: BridgeDebugView | null;
}) {
  const b = props.bridgeRaw;

  return (
    <details className="rounded-2xl border bg-white shadow-sm p-4">
      <summary className="cursor-pointer select-none">
        <div className="text-base font-semibold">
          /bridge 生レスポンス（デバッグ）
        </div>
        <div className="text-sm text-gray-600 mt-1">
          審査員には通常非表示。必要時のみ展開して、設定値とレスポンスを確認します。
        </div>
      </summary>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Event 側 L1</div>
          <div className="divide-y">
            <KeyValueRow
              label="eventFundingChainId"
              value={
                props.l1.eventFundingChainId === null
                  ? "null"
                  : String(props.l1.eventFundingChainId)
              }
              note="例: 43114"
            />
            <KeyValueRow
              label="eventFundingSourceAddress"
              value={props.l1.eventFundingSourceAddress ?? "null"}
              note="任意 / デモ用"
            />
            <KeyValueRow
              label="eventVaultAddress"
              value={props.l1.eventVaultAddress ?? "null"}
              note="Vault/EOAでも可"
            />
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Liquidity 側 L1</div>
          <div className="divide-y">
            <KeyValueRow
              label="liquidityChainId"
              value={
                props.l1.liquidityChainId === null
                  ? "null"
                  : String(props.l1.liquidityChainId)
              }
            />
            <KeyValueRow
              label="liquidityRecipientAddress"
              value={props.l1.liquidityRecipientAddress ?? "null"}
              note="受取アドレス"
            />
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">
            ICM/ICTT（Route A 用：現状は保存のみ）
          </div>
          <div className="divide-y">
            <KeyValueRow
              label="eventBlockchainId"
              value={props.l1.eventBlockchainId ?? "null"}
              note="bytes32"
            />
            <KeyValueRow
              label="liquidityBlockchainId"
              value={props.l1.liquidityBlockchainId ?? "null"}
              note="bytes32"
            />
            <KeyValueRow
              label="teleporterMessenger"
              value={props.l1.teleporterMessenger ?? "null"}
            />
            <KeyValueRow
              label="icttTokenAddress"
              value={props.l1.icttTokenAddress ?? "null"}
            />
            <KeyValueRow
              label="icttTokenHome"
              value={props.l1.icttTokenHome ?? "null"}
            />
            <KeyValueRow
              label="icttTokenRemote"
              value={props.l1.icttTokenRemote ?? "null"}
            />
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-sm font-semibold mb-2">
            /bridge 生レスポンス（要約）
          </div>
          <div className="text-xs text-gray-600">
            {b
              ? b.ok
                ? `ok: true / mode: ${b.mode ?? "N/A"}`
                : `ok: false / error: ${b.error ?? "N/A"}`
              : "未取得"}
          </div>

          {b?.l1 ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-gray-500 mb-2">
                  Event 側（レスポンス）
                </div>
                <div className="text-xs break-all">
                  chainId: {b.l1.eventFunding?.chainId ?? "N/A"}
                  <br />
                  source: {b.l1.eventFunding?.source ?? "N/A"}
                  <br />
                  vault: {b.l1.eventFunding?.vault ?? "N/A"}
                  <br />
                  token: {b.l1.eventFunding?.token ?? "N/A"}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-gray-500 mb-2">
                  Liquidity 側（レスポンス）
                </div>
                <div className="text-xs break-all">
                  chainId: {b.l1.liquidity?.chainId ?? "N/A"}
                  <br />
                  recipient: {b.l1.liquidity?.recipient ?? "N/A"}
                  <br />
                  token: {b.l1.liquidity?.token ?? "N/A"}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function L1Actions(props: {
  onSave: () => void;
  onRefreshAudit: () => void;
  saving?: boolean;
  loadingAudit?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-2">
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.saving === true}
          className="w-full rounded-xl bg-black text-white py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          L1 設定を保存
        </button>
        <div className="text-sm text-gray-600">
          L1 設定（Event / Liquidity / ICM / ICTT）を DB に保存します。
        </div>
        <div className="text-xs text-gray-500">
          Route A 用の blockchainId / teleporter / ictt
          は、現時点では「保存のみ」です。
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-2">
        <button
          type="button"
          onClick={props.onRefreshAudit}
          disabled={props.loadingAudit === true}
          className="w-full rounded-xl border border-black bg-white text-black py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          /bridge を叩いて監査カード表示
        </button>
        <div className="text-sm text-gray-600">
          /api/projects/[id]/bridge を呼び、レスポンス内の auditCard
          を表示します。
        </div>
        <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
          <li>
            auditCard がある場合：Vault / Recipient / DB合計 / 差分
            をそのまま表示します。
          </li>
          <li>
            auditCard がない場合：l1.balance と progressHint
            から合成して表示します。
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------
// Main component
// ---------------------------
export default function ProjectL1SettingsForm(
  props: ProjectL1SettingsFormProps
) {
  const currency = props.defaultCurrency ?? "JPYC";

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectL1View | null>(null);

  // Form state (string-first for inputs)
  const [eventFundingChainId, setEventFundingChainId] = useState<string>("");
  const [eventFundingSourceAddress, setEventFundingSourceAddress] =
    useState<string>("");
  const [eventVaultAddress, setEventVaultAddress] = useState<string>("");
  const [liquidityChainId, setLiquidityChainId] = useState<string>("");
  const [liquidityRecipientAddress, setLiquidityRecipientAddress] =
    useState<string>("");

  const [eventBlockchainId, setEventBlockchainId] = useState<string>("");
  const [liquidityBlockchainId, setLiquidityBlockchainId] =
    useState<string>("");
  const [teleporterMessenger, setTeleporterMessenger] = useState<string>("");
  const [icttTokenAddress, setIcttTokenAddress] = useState<string>("");
  const [icttTokenHome, setIcttTokenHome] = useState<string>("");
  const [icttTokenRemote, setIcttTokenRemote] = useState<string>("");

  // /bridge raw response
  const [bridgeRaw, setBridgeRaw] = useState<BridgeDebugView | null>(null);

  const l1View: L1ConfigView = useMemo(
    () => ({
      eventFundingChainId:
        toNullableNumberOrNull(parseNumberOrNull(eventFundingChainId)) ?? null,
      eventFundingSourceAddress: normalizeNullIfEmpty(
        eventFundingSourceAddress
      ),
      eventVaultAddress: normalizeNullIfEmpty(eventVaultAddress),

      liquidityChainId:
        toNullableNumberOrNull(parseNumberOrNull(liquidityChainId)) ?? null,
      liquidityRecipientAddress: normalizeNullIfEmpty(
        liquidityRecipientAddress
      ),

      eventBlockchainId: normalizeNullIfEmpty(eventBlockchainId),
      liquidityBlockchainId: normalizeNullIfEmpty(liquidityBlockchainId),
      teleporterMessenger: normalizeNullIfEmpty(teleporterMessenger),
      icttTokenAddress: normalizeNullIfEmpty(icttTokenAddress),
      icttTokenHome: normalizeNullIfEmpty(icttTokenHome),
      icttTokenRemote: normalizeNullIfEmpty(icttTokenRemote),
    }),
    [
      eventFundingChainId,
      eventFundingSourceAddress,
      eventVaultAddress,
      liquidityChainId,
      liquidityRecipientAddress,
      eventBlockchainId,
      liquidityBlockchainId,
      teleporterMessenger,
      icttTokenAddress,
      icttTokenHome,
      icttTokenRemote,
    ]
  );

  const bridgeOkText = useMemo(() => {
    if (!bridgeRaw) return "未実行";
    if (bridgeRaw.ok) return `OK: mode=${bridgeRaw.mode ?? "N/A"}`;
    return `NG: error=${bridgeRaw.error ?? "N/A"}`;
  }, [bridgeRaw]);

  const audit = useMemo(() => {
    const a = buildAuditCardView({
      currency,
      auditCardFromApi: bridgeRaw?.auditCard,
      l1FromApi: bridgeRaw?.l1,
      progressHintFromApi: bridgeRaw?.progressHint,
    });
    return a;
  }, [currency, bridgeRaw]);

  const fetchL1 = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(props.projectId)}/l1`,
        {
          method: "GET",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        }
      );

      const json: unknown = await res.json().catch(() => null);
      const parsed = parseL1GetResponse(json);

      if (!parsed) {
        setError("L1_GET_PARSE_FAILED");
        setLoading(false);
        return;
      }

      if (!parsed.ok) {
        setError(parsed.error);
        setLoading(false);
        return;
      }

      const p = parsed.project;
      setProject(p);

      // hydrate form state
      setEventFundingChainId(
        p.eventFundingChainId === null ? "" : String(p.eventFundingChainId)
      );
      setEventFundingSourceAddress(p.eventFundingSourceAddress ?? "");
      setEventVaultAddress(p.eventVaultAddress ?? "");
      setLiquidityChainId(
        p.liquidityChainId === null ? "" : String(p.liquidityChainId)
      );
      setLiquidityRecipientAddress(p.liquidityRecipientAddress ?? "");

      setEventBlockchainId(p.eventBlockchainId ?? "");
      setLiquidityBlockchainId(p.liquidityBlockchainId ?? "");
      setTeleporterMessenger(p.teleporterMessenger ?? "");
      setIcttTokenAddress(p.icttTokenAddress ?? "");
      setIcttTokenHome(p.icttTokenHome ?? "");
      setIcttTokenRemote(p.icttTokenRemote ?? "");

      setLoading(false);
    } catch (e: unknown) {
      console.error("L1_GET_FAILED", e);
      setError("L1_GET_FAILED");
      setLoading(false);
    }
  }, [props.projectId]);

  useEffect(() => {
    void fetchL1();
  }, [fetchL1]);

  const onSave = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      // Normalize & validate (strong guards)
      const chainEvent = normalizeChainIdOrThrow(
        parseNumberOrNull(eventFundingChainId),
        "EVENT_FUNDING_CHAIN_ID_INVALID"
      );
      const chainLiq = normalizeChainIdOrThrow(
        parseNumberOrNull(liquidityChainId),
        "LIQUIDITY_CHAIN_ID_INVALID"
      );

      const sourceAddr = normalizeAddressOrThrow(
        normalizeNullIfEmpty(eventFundingSourceAddress),
        "EVENT_FUNDING_SOURCE_ADDRESS_INVALID"
      );
      const vaultAddr = normalizeAddressOrThrow(
        normalizeNullIfEmpty(eventVaultAddress),
        "EVENT_VAULT_ADDRESS_INVALID"
      );
      const recipientAddr = normalizeAddressOrThrow(
        normalizeNullIfEmpty(liquidityRecipientAddress),
        "LIQUIDITY_RECIPIENT_ADDRESS_INVALID"
      );

      const evBid = normalizeBytes32OrThrow(
        normalizeNullIfEmpty(eventBlockchainId),
        "EVENT_BLOCKCHAIN_ID_INVALID"
      );
      const liqBid = normalizeBytes32OrThrow(
        normalizeNullIfEmpty(liquidityBlockchainId),
        "LIQUIDITY_BLOCKCHAIN_ID_INVALID"
      );

      const teleporter = normalizeAddressOrThrow(
        normalizeNullIfEmpty(teleporterMessenger),
        "TELEPORTER_MESSENGER_INVALID"
      );
      const tokenAddr = normalizeAddressOrThrow(
        normalizeNullIfEmpty(icttTokenAddress),
        "ICTT_TOKEN_ADDRESS_INVALID"
      );
      const tokenHome = normalizeAddressOrThrow(
        normalizeNullIfEmpty(icttTokenHome),
        "ICTT_TOKEN_HOME_INVALID"
      );
      const tokenRemote = normalizeAddressOrThrow(
        normalizeNullIfEmpty(icttTokenRemote),
        "ICTT_TOKEN_REMOTE_INVALID"
      );

      // Cross-field sanity (demo-friendly)
      if (vaultAddr !== null && sourceAddr === null) {
        throw new Error("VAULT_REQUIRES_SOURCE");
      }

      const body: Record<string, unknown> = {
        eventFundingChainId: chainEvent,
        eventFundingSourceAddress: sourceAddr,
        eventVaultAddress: vaultAddr,
        liquidityChainId: chainLiq,
        liquidityRecipientAddress: recipientAddr,

        eventBlockchainId: evBid,
        liquidityBlockchainId: liqBid,
        teleporterMessenger: teleporter,
        icttTokenAddress: tokenAddr,
        icttTokenHome: tokenHome,
        icttTokenRemote: tokenRemote,
      };

      const res = await fetch(
        `/api/projects/${encodeURIComponent(props.projectId)}/l1`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      const parsed = parseL1GetResponse(json);

      if (!parsed) {
        setError("L1_PATCH_PARSE_FAILED");
        setSaving(false);
        return;
      }
      if (!parsed.ok) {
        setError(parsed.error);
        setSaving(false);
        return;
      }

      setProject(parsed.project);
      setSaving(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "L1_PATCH_FAILED";
      setError(msg);
      setSaving(false);
    }
  }, [
    props.projectId,
    eventFundingChainId,
    liquidityChainId,
    eventFundingSourceAddress,
    eventVaultAddress,
    liquidityRecipientAddress,
    eventBlockchainId,
    liquidityBlockchainId,
    teleporterMessenger,
    icttTokenAddress,
    icttTokenHome,
    icttTokenRemote,
  ]);

  const onRefreshAudit = useCallback(async (): Promise<void> => {
    setLoadingAudit(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(props.projectId)}/bridge`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currency }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      const parsed = parseBridgeResponse(json);

      if (!parsed) {
        setBridgeRaw({ ok: false, error: "BRIDGE_PARSE_FAILED" });
        setLoadingAudit(false);
        return;
      }

      setBridgeRaw(parsed);
      setLoadingAudit(false);
    } catch (e: unknown) {
      console.error("BRIDGE_CALL_FAILED", e);
      setBridgeRaw({ ok: false, error: "BRIDGE_CALL_FAILED" });
      setLoadingAudit(false);
    }
  }, [props.projectId, currency]);

  // ---------------------------
  // Render
  // ---------------------------
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="text-sm text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-2">
        <div className="text-base font-semibold">L1 設定</div>
        <div className="text-sm text-gray-600">
          Project を取得できませんでした。
        </div>
        <div className="text-xs text-red-600">{error ?? "UNKNOWN"}</div>
        <button
          type="button"
          onClick={() => void fetchL1()}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="L1 設定 & /bridge（監査カード表示）"
        description="L1 設定を保存し、/bridge を呼び出して監査カード（Vault / Recipient / DB合計 / 差分）を表示します。"
        note="auditCard がレスポンスに含まれない場合でも、l1.balance と progressHint からカードを合成して表示します。"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-700">エラー</div>
          <div className="text-xs text-red-700 break-all mt-1">{error}</div>
        </div>
      ) : null}

      {/* Form */}
      <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-6">
        <div className="text-base font-semibold">L1 設定を編集</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldNumber
            label="eventFundingChainId"
            value={eventFundingChainId}
            onChange={setEventFundingChainId}
            placeholder="例: 43114"
            note="Event 側チェーンID（例: Avalanche C-Chain mainnet 43114）"
          />
          <FieldNumber
            label="liquidityChainId"
            value={liquidityChainId}
            onChange={setLiquidityChainId}
            placeholder="例: 43114"
            note="Liquidity 側チェーンID"
          />

          <Field
            label="eventFundingSourceAddress"
            value={eventFundingSourceAddress}
            onChange={setEventFundingSourceAddress}
            placeholder="0x..."
            note="任意 / デモ用（bridge 実行主体の想定）"
          />
          <Field
            label="eventVaultAddress"
            value={eventVaultAddress}
            onChange={setEventVaultAddress}
            placeholder="0x..."
            note="Vault/EOAでも可（監査カードで残高表示対象）"
          />

          <Field
            label="liquidityRecipientAddress"
            value={liquidityRecipientAddress}
            onChange={setLiquidityRecipientAddress}
            placeholder="0x..."
            note="受取アドレス（監査カードで残高表示対象）"
          />
        </div>

        <div className="pt-2 border-t">
          <div className="text-sm font-semibold">
            ICM/ICTT（Route A 用：現状は保存のみ）
          </div>
          <div className="text-xs text-gray-500 mt-1">
            デモ（Route B）では EXECUTE を
            DBログ化に寄せる前提のため、ここは「保存だけ」でも進められます。
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label="eventBlockchainId (bytes32)"
              value={eventBlockchainId}
              onChange={setEventBlockchainId}
              placeholder="0x + 64 hex"
              note="例: 0x1111..."
            />
            <Field
              label="liquidityBlockchainId (bytes32)"
              value={liquidityBlockchainId}
              onChange={setLiquidityBlockchainId}
              placeholder="0x + 64 hex"
              note="例: 0x2222..."
            />
            <Field
              label="teleporterMessenger"
              value={teleporterMessenger}
              onChange={setTeleporterMessenger}
              placeholder="0x..."
            />
            <Field
              label="icttTokenAddress"
              value={icttTokenAddress}
              onChange={setIcttTokenAddress}
              placeholder="0x..."
            />
            <Field
              label="icttTokenHome"
              value={icttTokenHome}
              onChange={setIcttTokenHome}
              placeholder="0x..."
            />
            <Field
              label="icttTokenRemote"
              value={icttTokenRemote}
              onChange={setIcttTokenRemote}
              placeholder="0x..."
            />
          </div>
        </div>

        <L1Actions
          onSave={() => void onSave()}
          onRefreshAudit={() => void onRefreshAudit()}
          saving={saving}
          loadingAudit={loadingAudit}
        />
      </div>

      {/* Audit Card */}
      <AuditCard
        projectTitle={`プロジェクト: ${project.title}`}
        projectStatus={project.status}
        bridgeOkText={bridgeOkText}
        currency={currency}
        audit={audit}
      />

      {/* ProgressHint (collapsible) */}
      <ProgressHintPanel progressHint={bridgeRaw?.progressHint ?? null} />

      {/* Debug panel (collapsible) */}
      <BridgeDebugPanel l1={l1View} bridgeRaw={bridgeRaw} />
    </div>
  );
}

// ---------------------------
// Local helpers (no any)
// ---------------------------
function parseNumberOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}
