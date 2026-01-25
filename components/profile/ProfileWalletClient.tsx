"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  usePublicClient,
} from "wagmi";
import { formatUnits, type Address } from "viem";

import { useEthersProvider } from "@/lib/useEthersSigner";
import {
  getChainConfig,
  getDefaultChainId,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";
import { getTokenOnChain, type TokenKey } from "@/lib/tokenRegistry";
import type { WalletBalances } from "@/lib/walletService";
import type { CreatorProfile } from "@/lib/profileTypes";
import { TipThanksCard } from "@/components/profile/TipThanksCard";
import { WalletSection } from "@/components/profile/WalletSection";
import {
  addAmount,
  clearLastTx,
  ERC20_ABI,
  getEthereum,
  getErrorMessage,
  getPublicClientForChain,
  INCREMENTS,
  isInAppBrowser,
  loadLastTx,
  normalizeAmountInput,
  openInMetaMaskDapp,
  saveLastTx,
  TOKENS,
  TRANSFER_EVENT,
  type Currency,
  type WalletFlags,
} from "@/components/profile/profileClientHelpers";

type ContributionArgs = {
  projectId?: string;
  purposeId?: string;
  chainId: number;
  currency: Currency;
  tokenAddress: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
};

type Props = {
  username: string;
  creator: CreatorProfile;
  projectId: string | null;
  supportedJpycChainIds: number[];
  showLegacyCard: boolean;
  headerColor: string;
  onPostContribution: (
    args: ContributionArgs
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onAfterSend: (txHash: string) => Promise<void>;
};

export function ProfileWalletClient({
  username,
  creator,
  projectId,
  supportedJpycChainIds,
  showLegacyCard,
  headerColor,
  onPostContribution,
  onAfterSend,
}: Props) {
  const account = useAccount();
  const { connector } = account;
  const connect = useConnect();
  const { disconnectAsync } = useDisconnect();
  const currentChainId = useChainId();
  const ethersProvider = useEthersProvider();
  const publicClient = usePublicClient();

  const DEFAULT_CHAIN: SupportedChainId = getDefaultChainId();
  const [selectedChainId, setSelectedChainId] =
    useState<SupportedChainId>(DEFAULT_CHAIN);

  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);

  const requiredChainConfig = getChainConfig(selectedChainId);

  const toAddress = creator.address ?? "";
  const [currency, setCurrency] = useState<Currency>("JPYC");
  const [amount, setAmount] = useState<string>(TOKENS["JPYC"].presets[0]);

  const [goalCurrentJpyc, setGoalCurrentJpyc] = useState<number | null>(null);

  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(
    null
  );
  const [walletBalancesLoading, setWalletBalancesLoading] = useState(false);

  const [totalLast24hJpyc, setTotalLast24hJpyc] = useState<number | null>(null);

  const [resumeBusy, setResumeBusy] = useState(false);
  const [suppressConnectUI, setSuppressConnectUI] = useState(false);

  const [inApp, setInApp] = useState(false);
  const searchParams = useSearchParams();

  // URL例: /kazu?projectId=123&purposeId=456
  const purposeId = searchParams.get("purposeId") || undefined;

  const activeAddress = account.address ?? "";
  const connected = account.status === "connected" && activeAddress.length > 0;

  const connectedChainId = currentChainId ?? null;

  const hasProject = !!projectId;

  const selectableChainIds: SupportedChainId[] = useMemo(() => {
    if (hasProject && supportedJpycChainIds.length > 0) {
      const filtered = supportedJpycChainIds
        .filter((id) => isSupportedChainId(id))
        .map((id) => id as SupportedChainId);

      if (filtered.length > 0) return filtered;
    }

    const fallback: SupportedChainId[] = [1, 137, 43114].filter((id) =>
      isSupportedChainId(id)
    ) as SupportedChainId[];

    return fallback.length > 0 ? fallback : [DEFAULT_CHAIN];
  }, [hasProject, supportedJpycChainIds.join("|"), DEFAULT_CHAIN]);

  useEffect(() => {
    if (selectableChainIds.length === 0) return;
    if (connected) return;

    if (!selectableChainIds.includes(selectedChainId)) {
      setSelectedChainId(selectableChainIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectableChainIds.join("|"), connected]);

  useEffect(() => {
    if (!connected) return;
    if (currentChainId == null) return;
    if (!isSupportedChainId(currentChainId)) return;

    const cid = currentChainId as SupportedChainId;

    if (hasProject && supportedJpycChainIds.length > 0) {
      if (!supportedJpycChainIds.includes(cid)) return;
    }

    if (!selectableChainIds.includes(cid)) return;

    setSelectedChainId((prev) => (prev === cid ? prev : cid));
  }, [
    connected,
    currentChainId,
    hasProject,
    supportedJpycChainIds.join("|"),
    selectableChainIds.join("|"),
  ]);

  const onWrongChain =
    connected && currentChainId != null && currentChainId !== selectedChainId;

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  async function resumeAfterReturnFromWallet() {
    if (typeof window === "undefined") return;

    const last = loadLastTx();
    if (!last) return;

    if (Date.now() - last.createdAtMs > 10 * 60 * 1000) {
      clearLastTx();
      return;
    }

    setResumeBusy(true);
    setSuppressConnectUI(true);

    try {
      setStatus("送金を確認しています…");

      const pc = getPublicClientForChain(last.chainId);
      if (!pc) {
        setStatus("対応していないチェーンです");
        return;
      }

      await pc.waitForTransactionReceipt({
        hash: last.txHash,
        timeout: 120_000,
      });

      if (last.projectId) {
        const tx = await pc.getTransaction({ hash: last.txHash });

        const token = getTokenOnChain(
          last.currency,
          last.chainId as SupportedChainId
        );
        if (!token) {
          setStatus("トークン設定が見つかりません");
          return;
        }

        await onPostContribution({
          projectId: last.projectId ?? undefined,
          purposeId: last.purposeId ?? undefined,
          chainId: last.chainId,
          currency: last.currency,
          tokenAddress: token.address,
          txHash: last.txHash,
          fromAddress: tx.from,
          toAddress: last.toAddress,
          amount: last.amount,
        });

        await onAfterSend(last.txHash);
      }

      setStatus("送金が反映されました");
    } catch (e) {
      console.error("resumeAfterReturnFromWallet failed", e);
      setStatus("送金確認に失敗しました");
    } finally {
      clearLastTx();
      setResumeBusy(false);
      setSuppressConnectUI(false);
    }
  }

  useEffect(() => {
    void resumeAfterReturnFromWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getGlobalEthereum():
    | (WalletFlags & { request?: unknown })
    | undefined {
    if (typeof window === "undefined") return undefined;
    const w = window as Window & {
      ethereum?: WalletFlags & { request?: unknown };
    };
    return w.ethereum;
  }

  function resolveWalletLabel(): string {
    const eth = getGlobalEthereum();

    if (eth?.isMetaMask) return "MetaMask";
    if (eth?.isRabby) return "Rabby";
    if (eth?.isCoinbaseWallet) return "Coinbase Wallet";
    if (eth?.isOkxWallet || eth?.isOKXWallet) return "OKX Wallet";
    if (eth?.isBinanceWallet) return "Binance Wallet";
    if (eth?.isPhantom) return "Phantom Wallet (EVM)";
    if (eth?.isBitgetWallet) return "Bitget Wallet";
    if (eth?.isTokenPocket) return "TokenPocket";
    if (eth?.isMathWallet) return "MathWallet";
    if (eth?.isFrontier) return "Frontier Wallet";
    if (eth?.isSafe) return "Safe (Gnosis Safe)";
    if (eth?.isZerion) return "Zerion Wallet";
    if (eth?.isEnkrypt) return "Enkrypt Wallet";
    if (eth?.isTallyWallet) return "Tally Wallet";
    if (eth?.isBraveWallet) return "Brave Wallet";
    if (eth?.isTrust) return "Trust Wallet";
    if (eth?.isSequence) return "Sequence Wallet";
    if (eth?.isFrame) return "Frame Wallet";
    if (eth?.isXDEFI) return "XDEFI Wallet";
    if (eth?.isFireblocks) return "Fireblocks Wallet";

    if (connector?.name) {
      const name = connector.name;
      const lower = name.toLowerCase();

      if (lower.includes("hashport")) return "hashPort Wallet";
      if (lower.includes("rabby")) return "Rabby";
      if (lower.includes("metamask")) return "MetaMask";

      return name;
    }
    return "ウォレット";
  }

  const [walletLabel, setWalletLabel] = useState("ウォレット");

  useEffect(() => {
    setWalletLabel(resolveWalletLabel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  async function refreshGoalProgress() {
    if (!creator.address || !creator.goalTitle || !creator.goalTargetJpyc) {
      return;
    }

    const { readBalances } = await import("@/lib/walletService");

    try {
      const tokenKeys: readonly TokenKey[] = ["JPYC"];
      const balances = await readBalances({
        chainId: selectedChainId,
        account: creator.address as Address,
        tokenKeys,
      });
      const jpyc = balances.tokens.JPYC;
      if (!jpyc) return;

      const human = Number(jpyc.formatted);
      setGoalCurrentJpyc(human);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!creator.address || !creator.goalTargetJpyc) return;
    void refreshGoalProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.address, creator.goalTargetJpyc, selectedChainId]);

  async function fetchWalletBalances() {
    if (!connected || !activeAddress || onWrongChain) {
      setWalletBalances(null);
      setWalletBalancesLoading(false);
      return;
    }

    setWalletBalancesLoading(true);
    const { readBalances } = await import("@/lib/walletService");
    try {
      const tokenKeys: readonly TokenKey[] = ["JPYC"];
      const balances = await readBalances({
        chainId: selectedChainId,
        account: activeAddress as Address,
        tokenKeys,
      });
      setWalletBalances(balances);
    } catch (e) {
      console.error("Failed to fetch wallet balances:", e);
      setWalletBalances(null);
    } finally {
      setWalletBalancesLoading(false);
    }
  }

  useEffect(() => {
    void fetchWalletBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activeAddress, onWrongChain, selectedChainId]);

  useEffect(() => {
    if (
      !publicClient ||
      !connected ||
      !activeAddress ||
      !creator.address ||
      onWrongChain
    ) {
      setTotalLast24hJpyc(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const latest = Number(latestBlock);
        const approxBlocksPerDay = 43_200;
        const fromBlock = BigInt(Math.max(latest - approxBlocksPerDay, 0));
        const toBlock = latestBlock;

        const jpycOnChain = getTokenOnChain("JPYC", selectedChainId);
        if (!jpycOnChain) {
          if (!cancelled) setTotalLast24hJpyc(null);
          return;
        }

        const logs = await publicClient.getLogs({
          address: jpycOnChain.address,
          event: TRANSFER_EVENT,
          args: {
            from: activeAddress as `0x${string}`,
            to: creator.address as `0x${string}`,
          },
          fromBlock,
          toBlock,
        });

        let totalRaw = 0n;
        for (const log of logs) {
          const v = log.args.value ?? 0n;
          totalRaw += v;
        }

        const total = Number(formatUnits(totalRaw, jpycOnChain.decimals ?? 18));
        if (!cancelled) setTotalLast24hJpyc(total);
      } catch (e) {
        console.error("Failed to fetch last 24h tips:", e);
        if (!cancelled) setTotalLast24hJpyc(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    publicClient,
    connected,
    activeAddress,
    creator.address,
    onWrongChain,
    selectedChainId,
  ]);

  async function switchChainToSelected() {
    const eth = getEthereum();
    if (!eth) return;

    const cfg = getChainConfig(selectedChainId);
    if (!cfg) return;

    const chainHex = `0x${cfg.id.toString(16)}`;
    const rpcUrl = cfg.viemChain.rpcUrls.default.http[0] ?? "";

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
      return;
    } catch {
      // 未登録の可能性 → add → switch
    }

    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: cfg.name,
            nativeCurrency: {
              name: cfg.nativeSymbol,
              symbol: cfg.nativeSymbol,
              decimals: 18,
            },
            rpcUrls: rpcUrl ? [rpcUrl] : [],
            blockExplorerUrls: cfg.explorerBaseUrl ? [cfg.explorerBaseUrl] : [],
          },
        ],
      });
    } catch {
      // ignore
    }

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch {
      // ignore
    }
  }

  async function disconnectWallet(): Promise<void> {
    try {
      await disconnectAsync();
    } catch (e) {
      console.warn("disconnectWallet failed:", e);
    }

    const { appkit } = await import("@/lib/appkitInstance");
    if (
      typeof (appkit as unknown as { disconnect?: () => Promise<void> })
        .disconnect === "function"
    ) {
      await (
        appkit as unknown as { disconnect: () => Promise<void> }
      ).disconnect();
    }
    if (typeof window !== "undefined") {
      const keys = Object.keys(window.localStorage);
      for (const k of keys) {
        if (
          k.startsWith("wc@2:") ||
          k.startsWith("walletconnect") ||
          k.includes("WALLETCONNECT") ||
          k.includes("appkit") ||
          k.includes("reown")
        ) {
          window.localStorage.removeItem(k);
        }
      }
    }
  }

  async function send(overrideAmount?: string) {
    if (!connected) {
      alert("ウォレットを接続してください");
      return;
    }
    if (onWrongChain) {
      alert(
        "ネットワークを切り替えてください（下部の切替ボタンから変更できます）"
      );
      return;
    }
    if (!toAddress) {
      alert("送金先アドレスを入力してください");
      return;
    }

    if (!ethersProvider) {
      setStatus("ウォレットプロバイダが見つかりません");
      return;
    }

    const { ethers } = await import("ethers");

    try {
      setSending(true);
      setStatus("送金中…ウォレットで承認してください");

      const signer = await ethersProvider.getSigner();

      const tokenKey: TokenKey = currency;
      const tokenOnChain = getTokenOnChain(tokenKey, selectedChainId);
      if (!tokenOnChain) {
        setStatus("このチェーンではトークン設定がありません");
        return;
      }

      const tokenAddress = tokenOnChain.address as string;
      const decimals = tokenOnChain.decimals;

      const code = await ethersProvider.getCode(tokenAddress);
      if (!code || code === "0x") {
        setStatus("指定トークンアドレスにコントラクトがありません");
        return;
      }

      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const amtStr = (overrideAmount ?? amount)?.trim();
      const human = Number(amtStr);
      if (!Number.isFinite(human) || human <= 0) {
        alert("金額を入力してください");
        return;
      }

      const value = ethers.parseUnits(amtStr, decimals);

      const sender = await signer.getAddress();
      const bal: bigint = await token.balanceOf(sender);
      if (bal < value) {
        alert("トークン残高が不足しています");
        return;
      }

      const tx = await token.transfer(toAddress, value);

      saveLastTx({
        txHash: tx.hash as `0x${string}`,
        chainId: selectedChainId,
        currency,
        amount: amtStr,
        toAddress,
        projectId: projectId ?? null,
        purposeId: purposeId ?? null,
        createdAtMs: Date.now(),
      });

      setStatus(
        `送金を送信しました。反映を確認中…（Tx: ${tx.hash.slice(0, 10)}…）`
      );

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({
          hash: tx.hash as `0x${string}`,
          confirmations: 1,
          timeout: 120_000,
        });
      }

      await onPostContribution({
        projectId: projectId ?? undefined,
        purposeId,
        chainId: selectedChainId,
        currency,
        tokenAddress,
        txHash: tx.hash,
        fromAddress: sender,
        toAddress,
        amount: amtStr,
      });

      void refreshGoalProgress();
      await onAfterSend(tx.hash);

      void fetchWalletBalances();

      const short = tx.hash.slice(0, 10);
      const unit = currency === "JPYC" ? "円 / JPY" : "USD";
      setStatus(`完了：${amtStr} ${unit} を送金しました（Tx: ${short}…）`);
    } catch (e) {
      const msg = getErrorMessage(e);
      setStatus(`${msg} / Transaction failed.`);
    } finally {
      setSending(false);
    }
  }

  const incrementButtons = useMemo(() => {
    return INCREMENTS[currency].map((delta) => {
      const label = currency === "JPYC" ? `+${delta} JPYC` : `+${delta} USD`;
      return {
        key: String(delta),
        label,
        disabled: sending,
        onClick: () => {
          setAmount((prev) => addAmount(prev, delta, currency));
        },
      };
    });
  }, [currency, sending]);

  const profileAddressUrl =
    creator.address && requiredChainConfig?.explorerBaseUrl
      ? `${requiredChainConfig.explorerBaseUrl}/address/${creator.address}`
      : requiredChainConfig?.explorerBaseUrl ?? "";

  return (
    <>
      {showLegacyCard && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-300 bg-white/95 dark:bg-white/95 shadow-sm">
          <div className="p-4">
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">
                  目標 / Goal (on-chain balance)
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-900">
                  {creator.goalTitle}
                </p>
              </div>
              <div className="text-right text-xs text-gray-600 dark:text-gray-700">
                {goalCurrentJpyc != null ? (
                  <>
                    <span className="font-mono">
                      {Math.min(
                        goalCurrentJpyc,
                        creator.goalTargetJpyc as number
                      ).toLocaleString()}
                    </span>
                    {" / "}
                    <span className="font-mono">
                      {(creator.goalTargetJpyc as number).toLocaleString()}
                    </span>
                    <span className="ml-1">JPYC</span>
                  </>
                ) : (
                  <span>読み込み中… / Loading…</span>
                )}
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
              <div
                className="h-full transition-all duration-500"
                style={{
                  backgroundColor: headerColor,
                  width: `${Math.min(
                    100,
                    goalCurrentJpyc != null && creator.goalTargetJpyc
                      ? (goalCurrentJpyc / creator.goalTargetJpyc) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-600 leading-relaxed">
              <p>
                Explorer:&nbsp;
                <a
                  className="underline hover:no-underline break-all"
                  href={profileAddressUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {requiredChainConfig
                    ? `${requiredChainConfig.shortName} Explorer`
                    : "Explorer"}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      <WalletSection
        connected={connected}
        isWalletConnecting={
          account.status === "connecting" ||
          account.status === "reconnecting" ||
          connect.status === "pending"
        }
        walletLabel={walletLabel}
        activeAddress={activeAddress}
        currentChainId={currentChainId}
        selectedChainId={selectedChainId}
        connectedChainId={connectedChainId}
        onWrongChain={onWrongChain}
        inApp={inApp}
        suppressConnectUI={suppressConnectUI}
        resumeBusy={resumeBusy}
        walletBalances={walletBalances}
        walletBalancesLoading={walletBalancesLoading}
        showSendUI={connected && !onWrongChain}
        headerColor={headerColor}
        creatorDisplayName={creator.displayName || username}
        selectableChainIds={selectableChainIds}
        currency={currency}
        amount={amount}
        onDisconnect={() => void disconnectWallet()}
        onOpenInMetaMaskDapp={openInMetaMaskDapp}
        onSwitchChainToSelected={() => void switchChainToSelected()}
        onRefreshBalances={() => void fetchWalletBalances()}
        onChangeChain={(next) => {
          if (!isSupportedChainId(next)) return;
          setSelectedChainId(next as SupportedChainId);
        }}
        onChangeCurrency={(next) => {
          setCurrency(next);
          setAmount(TOKENS[next].presets[0]);
        }}
        onChangeAmount={(next) => {
          setAmount(normalizeAmountInput(next, currency));
        }}
        onSend={() => {
          const v = normalizeAmountInput(amount, currency);
          if (v) void send(v);
        }}
        onSendEnter={() => {
          const v = normalizeAmountInput(amount, currency);
          if (v) void send(v);
        }}
        incrementButtons={incrementButtons}
        sending={sending}
      />

      {connected &&
        !onWrongChain &&
        totalLast24hJpyc != null &&
        totalLast24hJpyc > 0 && (
          <div className="mt-4 flex justify-center">
            <TipThanksCard
              amountYen={totalLast24hJpyc}
              artistName={creator.displayName || username}
            />
          </div>
        )}

      <p
        className="mt-4 text-sm text-center text-gray-700 dark:text-gray-800 min-h-6"
        aria-live="polite"
      >
        {status}
      </p>
    </>
  );
}
