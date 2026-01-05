// components/profile/profileClientHelpers.ts
import type { Eip1193Provider } from "ethers";
import { createPublicClient, http, parseAbiItem } from "viem";
import { getChainConfig } from "@/lib/chainConfig";

const LAST_TX_KEY = "cf:lastTx:v1";

export type Currency = "JPYC" | "USDC";

export type LastTx = {
  txHash: `0x${string}`;
  chainId: number;
  currency: Currency;
  amount: string; // human string
  toAddress: string;
  projectId: string | null;
  purposeId: string | null;
  createdAtMs: number; // Date.now()
};

export type WalletProvider = Eip1193Provider & {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type WalletFlags = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isOkxWallet?: boolean;
  isOKXWallet?: boolean;
  isBinanceWallet?: boolean;
  isPhantom?: boolean;
  isBitgetWallet?: boolean;
  isTokenPocket?: boolean;
  isMathWallet?: boolean;
  isFrontier?: boolean;
  isSafe?: boolean;
  isZerion?: boolean;
  isEnkrypt?: boolean;
  isTallyWallet?: boolean;
  isBraveWallet?: boolean;
  isTrust?: boolean;
  isSequence?: boolean;
  isFrame?: boolean;
  isXDEFI?: boolean;
  isFireblocks?: boolean;
};

export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export const TOKENS: Record<Currency, { label: string; presets: string[] }> = {
  JPYC: {
    label: "JPYC",
    presets: ["10", "50", "100"],
  },
  USDC: {
    label: "USDC",
    presets: ["0.10", "0.50", "1.00"],
  },
};

export const INCREMENTS: Record<Currency, string[]> = {
  JPYC: ["10", "100", "1000"],
  USDC: ["0.1", "1", "10"],
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isHexTxHash(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v);
}

function isCurrency(v: unknown): v is Currency {
  return v === "JPYC" || v === "USDC";
}

function parseLastTx(v: unknown): LastTx | null {
  if (!isRecord(v)) return null;

  const txHash = v.txHash;
  const chainId = v.chainId;
  const currency = v.currency;
  const amount = v.amount;
  const toAddress = v.toAddress;
  const projectId = v.projectId;
  const purposeId = v.purposeId;
  const createdAtMs = v.createdAtMs;

  if (!isHexTxHash(txHash)) return null;
  if (typeof chainId !== "number" || !Number.isFinite(chainId)) return null;
  if (!isCurrency(currency)) return null;
  if (typeof amount !== "string" || amount.length === 0) return null;
  if (typeof toAddress !== "string" || toAddress.length === 0) return null;

  if (!(typeof projectId === "string" || projectId === null)) return null;
  if (!(typeof purposeId === "string" || purposeId === null)) return null;

  if (typeof createdAtMs !== "number" || !Number.isFinite(createdAtMs))
    return null;

  return {
    txHash,
    chainId,
    currency,
    amount,
    toAddress,
    projectId,
    purposeId,
    createdAtMs,
  };
}

export function getPublicClientForChain(chainId: number) {
  const cfg = getChainConfig(chainId);
  if (!cfg) return null;
  const rpc = cfg.viemChain.rpcUrls.default.http[0];
  if (!rpc) return null;
  return createPublicClient({
    chain: cfg.viemChain,
    transport: http(rpc),
  });
}

export function loadLastTx(): LastTx | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_TX_KEY);
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as unknown;
    return parseLastTx(json);
  } catch {
    return null;
  }
}

export function saveLastTx(v: LastTx): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_TX_KEY, JSON.stringify(v));
}

export function clearLastTx(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_TX_KEY);
}

export function getEthereum(): WalletProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: unknown }).ethereum as
    | WalletProvider
    | undefined;
}

export function getErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** アプリ内ブラウザ(Twitter/X, Instagram, LINE, etc.)ざっくり判定 */
export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Twitter|Instagram|FBAN|FBAV|Line\/|LINE|MicroMessenger/i.test(ua);
}

/** MetaMaskモバイルでこのdAppを開く Deep Link */
export function openInMetaMaskDapp() {
  if (typeof window === "undefined") return;

  const { host, pathname, search } = window.location;
  const dappPath = `${host}${pathname}${search}`;
  window.location.href = `https://metamask.app.link/dapp/${dappPath}`;
}

export function formatJpyc(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function clampPct(p: number): number {
  if (!Number.isFinite(p)) return 0;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

export function normalizeAmountInput(raw: string, cur: Currency): string {
  const s = raw.replace(/[^\d.]/g, "");
  if (cur === "JPYC") return s.split(".")[0] || "";
  const [head, ...rest] = s.split(".");
  return head + (rest.length ? "." + rest.join("").replace(/\./g, "") : "");
}

export function addAmount(
  current: string,
  delta: string,
  cur: Currency
): string {
  const curNorm = normalizeAmountInput(current || "0", cur);
  const deltaNorm = normalizeAmountInput(delta, cur);

  const curNum = Number(curNorm || "0");
  const deltaNum = Number(deltaNorm || "0");

  const sum = curNum + deltaNum;
  if (!Number.isFinite(sum) || sum < 0) {
    return curNorm || "0";
  }

  if (cur === "JPYC") {
    return String(Math.floor(sum));
  }

  return sum.toFixed(2);
}
