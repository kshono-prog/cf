// components/projects/ProjectL1SettingsForm.AuditPanels.tsx
// ProjectL1SettingsForm.tsx に統合しやすい「UI骨組み」。
// - 文言セットを JSX に埋め込み済み
// - 分割案: AuditCard / ProgressHintPanel / BridgeDebugPanel
// - any なし（unknown + 型ガード）
// - Tailwind 前提（既存プロジェクトに合わせて調整してください）

import React from "react";

// ---------------------------
// Types (minimal, UI-facing)
// ---------------------------
type BalanceView = {
  raw: string; // e.g. "1000000000000000000"
  formatted: string; // e.g. "1.0"
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

type ProgressHintView = {
  dbConfirmedTotalInt?: number;
  dbConfirmedTotalAmountDecimal?: string;
  note?: string;
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

type BridgeDebugView = {
  ok: boolean;
  mode?: string;
  error?: string;
  // raw l1/progress are optional
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
  auditCard?: Partial<AuditCardView>;
};

type ProjectHeaderView = {
  title: string;
  status: string;
};

// ---------------------------
// Runtime guards (unknown -> typed)
// ---------------------------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function toOptionalNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toOptionalBalanceView(v: unknown): BalanceView | null {
  if (!isRecord(v)) return null;
  const raw = toOptionalString(v.raw);
  const formatted = toOptionalString(v.formatted);
  if (typeof raw !== "string" || typeof formatted !== "string") return null;
  return { raw, formatted };
}

/**
 * API が auditCard を返さない場合に、l1.balance と progressHint から
 * UI表示用の AuditCardView を合成する（文言セットの要件）。
 */
export function buildAuditCardView(params: {
  currency: string;
  auditCardFromApi?: unknown;
  l1FromApi?: unknown;
  progressHintFromApi?: unknown;
}): AuditCardView {
  const { currency, auditCardFromApi, l1FromApi, progressHintFromApi } = params;

  // 1) auditCard があれば優先（ただしガードで必要な範囲だけ取り込む）
  if (isRecord(auditCardFromApi)) {
    const vault = toOptionalBalanceView(auditCardFromApi.vault);
    const recipient = toOptionalBalanceView(auditCardFromApi.recipient);

    const dbInt =
      typeof auditCardFromApi.dbConfirmedTotalInt === "number" &&
      Number.isFinite(auditCardFromApi.dbConfirmedTotalInt)
        ? auditCardFromApi.dbConfirmedTotalInt
        : null;

    const dbDec =
      toOptionalString(auditCardFromApi.dbConfirmedTotalAmountDecimal) ?? null;

    const diffHuman = toOptionalString(auditCardFromApi.diffHuman) ?? null;
    const diffRaw = toOptionalString(auditCardFromApi.diffRaw) ?? null;

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

  // 2) auditCard が無い場合は合成
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
    ? toOptionalString(hint.dbConfirmedTotalAmountDecimal) ?? null
    : null;

  // diff の算出：raw 同士が両方数値文字列なら差分を計算、それ以外は N/A
  let diffRaw: string | null = "N/A";
  let diffHuman: string | null = "N/A";

  try {
    if (vaultBal && recipientBal && typeof dbInt === "number") {
      // ここでは「Recipient 残高 vs DB」を主として差分を出す（デモ向け）
      // ※要件に合わせ、on-chain - DB を提示。raw は decimals を知らないと厳密差分が崩れるため N/A fallback。
      // まず human（formatted）を数値として扱える場合のみ計算。
      const onChainHuman = Number(recipientBal.formatted);
      if (Number.isFinite(onChainHuman)) {
        const d = onChainHuman - dbInt;
        diffHuman = String(d);
      } else {
        diffHuman = "N/A";
      }

      // raw の差分は BigInt で計算（recipient raw を DB(=int) に換算できないので原則 N/A）
      // ただし「DBが 18 decimals 前提」などの運用をする場合はここを変更。
      diffRaw = "N/A";
    }
  } catch {
    diffRaw = "N/A";
    diffHuman = "N/A";
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
// UI building blocks
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
// Components: AuditCard / ProgressHintPanel / BridgeDebugPanel
// ---------------------------
export function AuditCard(props: {
  project: ProjectHeaderView;
  bridgeOkText: string; // e.g. "OK（mode: READ_ONCHAIN）" or "NG（error: ...）"
  currency: string;
  audit: AuditCardView;
}) {
  const a = props.audit;

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">プロジェクト</div>
          <div className="text-base font-semibold break-words">
            {props.project.title}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">status</div>
          <div className="text-sm font-semibold">{props.project.status}</div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        <div className="text-xs text-gray-500">/bridge 結果</div>
        <div className="text-sm font-medium">{props.bridgeOkText}</div>
      </div>

      {/* Main Audit Card */}
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
          {/* Vault */}
          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Vault 残高</div>
              </div>
              <DualValue
                humanLabel="表示（human）"
                human={a.vault?.formatted ?? null}
                rawLabel="raw（最小単位）"
                raw={a.vault?.raw ?? null}
              />
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Recipient 残高</div>
              </div>
              <DualValue
                humanLabel="表示（human）"
                human={a.recipient?.formatted ?? null}
                rawLabel="raw（最小単位）"
                raw={a.recipient?.raw ?? null}
              />
            </div>
          </div>

          {/* DB total */}
          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">
                  DB 合計（CONFIRMED）
                </div>
              </div>
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

          {/* Diff */}
          <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">
                  差分（on-chain − DB）
                </div>
              </div>
              <DualValue
                humanLabel="差分（human）"
                human={a.diffHuman}
                rawLabel="差分（raw）"
                raw={a.diffRaw}
              />
            </div>
          </div>
        </div>

        {/* Diff interpretation */}
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

export function ProgressHintPanel(props: {
  progressHint: ProgressHintView | null;
}) {
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

export function BridgeDebugPanel(props: {
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

      {/* L1 settings (from DB/form state) */}
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

        {/* Raw response */}
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

// ---------------------------
// Buttons (text + helper text)
// ---------------------------
export function L1Actions(props: {
  onSave: () => void;
  onRefreshAudit: () => void;
  saving?: boolean;
  loadingAudit?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Button A: Save */}
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

      {/* Button B: Refresh audit card */}
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
// Example integration snippet
// ---------------------------
//
// ProjectL1SettingsForm.tsx 内で以下のように呼べます:
//
// <SectionTitle
//   title="L1 設定 & /bridge（監査カード）"
//   description="L1 設定を保存し、/bridge を呼び出して監査カード（Vault / Recipient / DB合計 / 差分）を表示します。"
//   note="auditCard がレスポンスに含まれない場合でも、l1.balance と progressHint からカードを合成して表示します。"
// />
//
// <L1Actions onSave={saveL1} onRefreshAudit={refreshBridgeAudit} saving={saving} loadingAudit={loading} />
//
// const audit = buildAuditCardView({
//   currency: currencyState,
//   auditCardFromApi: bridgeResponse?.auditCard,
//   l1FromApi: bridgeResponse?.l1,
//   progressHintFromApi: bridgeResponse?.progressHint,
// });
//
// <AuditCard
//   project={{ title: project.title, status: project.status }}
//   bridgeOkText={bridgeOkText}
//   currency={currencyState}
//   audit={audit}
// />
//
// <ProgressHintPanel progressHint={bridgeResponse?.progressHint ?? null} />
//
// <BridgeDebugPanel l1={currentL1ConfigState} bridgeRaw={bridgeResponse ?? null} />
//
