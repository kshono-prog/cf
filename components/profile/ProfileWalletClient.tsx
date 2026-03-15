"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  usePublicClient,
  useSwitchChain,
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
import { isRecord } from "@/lib/publicSummary";
import {
  addAmount,
  clearLastTx,
  ERC20_ABI,
  getErrorMessage,
  getPublicClientForChain,
  INCREMENTS,
  isInAppBrowser,
  type LastTx,
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
  contributionId?: string;
  projectId?: string;
  purposeId?: string;
  postId?: string;
  chainId: number;
  currency: Currency;
  tokenAddress: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
};

type ContributionPreflightArgs = {
  projectId: string;
  purposeId?: string;
  postId?: string | null;
  chainId: number;
  currency: Currency;
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountRaw: string;
  decimals: number;
};

type Props = {
  username: string;
  creator: CreatorProfile;
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  supportedJpycChainIds: number[];
  supportedChainIdsByCurrency?: {
    JPYC: number[];
    USDC: number[];
  } | null;
  showLegacyCard: boolean;
  headerColor: string;
  selectedPostId: string | null;
  selectedPostSummary: string | null;
  selectedPostCurrency: Currency | null;
  onClearSelectedPost: () => void;
  onPostContribution: (
    args: ContributionArgs
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onAfterSend: (txHash: string, postId?: string | null) => Promise<void>;
};

export function ProfileWalletClient({
  username,
  creator,
  projectId,
  projectIdsByCurrency,
  supportedJpycChainIds,
  supportedChainIdsByCurrency,
  showLegacyCard,
  headerColor,
  selectedPostId,
  selectedPostSummary,
  selectedPostCurrency,
  onClearSelectedPost,
  onPostContribution,
  onAfterSend,
}: Props) {
  const account = useAccount();
  const { connector } = account;
  const connect = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
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
  const [resolvedProjectIdsByCurrency, setResolvedProjectIdsByCurrency] =
    useState<{
      JPYC: string | null;
      USDC: string | null;
    }>({
      JPYC: projectIdsByCurrency?.JPYC ?? projectId ?? null,
      USDC: projectIdsByCurrency?.USDC ?? null,
    });
  const [fallbackProjectId, setFallbackProjectId] = useState<string | null>(
    projectId
  );

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

  const hasProject =
    !!fallbackProjectId ||
    !!resolvedProjectIdsByCurrency.JPYC ||
    !!resolvedProjectIdsByCurrency.USDC;

  useEffect(() => {
    setResolvedProjectIdsByCurrency({
      JPYC: projectIdsByCurrency?.JPYC ?? projectId ?? null,
      USDC: projectIdsByCurrency?.USDC ?? null,
    });
    setFallbackProjectId(projectId);
  }, [projectId, projectIdsByCurrency]);

  const allowedChainIdsForCurrency = useMemo(() => {
    if (currency === "USDC") {
      const usdcIds = supportedChainIdsByCurrency?.USDC ?? [];
      if (hasProject && usdcIds.length > 0) return usdcIds;
    }
    if (hasProject && supportedJpycChainIds.length > 0) {
      return supportedJpycChainIds;
    }
    return [];
  }, [currency, hasProject, supportedChainIdsByCurrency, supportedJpycChainIds]);

  const selectableChainIds: SupportedChainId[] = useMemo(() => {
    if (allowedChainIdsForCurrency.length > 0) {
      const filtered = allowedChainIdsForCurrency
        .filter((id) => isSupportedChainId(id))
        .map((id) => id as SupportedChainId);

      if (filtered.length > 0) return filtered;
    }

    const fallback: SupportedChainId[] = [1, 137, 43114].filter((id) =>
      isSupportedChainId(id)
    ) as SupportedChainId[];

    return fallback.length > 0 ? fallback : [DEFAULT_CHAIN];
  }, [allowedChainIdsForCurrency, DEFAULT_CHAIN]);

  useEffect(() => {
    if (!selectedPostCurrency || currency === selectedPostCurrency) return;
    setCurrency(selectedPostCurrency);
    setAmount(TOKENS[selectedPostCurrency].presets[0]);
  }, [currency, selectedPostCurrency]);

  useEffect(() => {
    if (selectableChainIds.length === 0) return;

    if (!selectableChainIds.includes(selectedChainId)) {
      setSelectedChainId(selectableChainIds[0]);
    }
  }, [selectableChainIds, selectedChainId]);

  useEffect(() => {
    if (!connected) return;
    if (currentChainId == null) return;
    if (!isSupportedChainId(currentChainId)) return;

    const cid = currentChainId as SupportedChainId;

    if (allowedChainIdsForCurrency.length > 0) {
      if (!allowedChainIdsForCurrency.includes(cid)) return;
    }

    if (!selectableChainIds.includes(cid)) return;

    setSelectedChainId((prev) => (prev === cid ? prev : cid));
  }, [
    connected,
    currentChainId,
    allowedChainIdsForCurrency,
    selectableChainIds,
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
    let recorded = false;

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
        const persistResult = await persistContributionRecord(last);
        if (!persistResult.ok) {
          setStatus(persistResult.message);
          return;
        }

        recorded = true;
      }

      setStatus("送金が反映されました");
    } catch (e) {
      console.error("resumeAfterReturnFromWallet failed", e);
      setStatus("送金確認に失敗しました");
    } finally {
      if (recorded) {
        clearLastTx();
      }
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
    if (!connected || !activeAddress) {
      setWalletBalances(null);
      setWalletBalancesLoading(false);
      return;
    }

    const balanceChainId: SupportedChainId = isSupportedChainId(
      currentChainId ?? 0
    )
      ? (currentChainId as SupportedChainId)
      : selectedChainId;

    setWalletBalancesLoading(true);
    const { readBalances } = await import("@/lib/walletService");
    try {
      const tokenKeys: readonly TokenKey[] = ["JPYC", "USDC"];
      const balances = await readBalances({
        chainId: balanceChainId,
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
  }, [connected, activeAddress, currentChainId, selectedChainId]);

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
    const cfg = getChainConfig(selectedChainId);
    if (!cfg) return;

    try {
      setStatus(`${cfg.name} への切り替えを確認しています…`);
      await switchChainAsync({ chainId: selectedChainId });
      setStatus("");
      return;
    } catch (error) {
      const message = getErrorMessage(error);
      setStatus(
        message && message !== "[object Object]"
          ? `ネットワーク切り替えに失敗しました: ${message}`
          : "ウォレット側でネットワーク切り替えを完了してください。"
      );
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

  async function ensureContributionPreflight(
    args: ContributionPreflightArgs
  ): Promise<
    | { ok: true; contributionId: string }
    | { ok: false; message: string }
  > {
    try {
      const response = await fetch("/api/contributions/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          projectId: args.projectId,
          purposeId: args.purposeId ?? null,
          postId: args.postId ?? null,
          chainId: args.chainId,
          currency: args.currency,
          fromAddress: args.fromAddress,
          toAddress: args.toAddress,
          amount: args.amount,
          amountRaw: args.amountRaw,
          decimals: args.decimals,
        }),
      });

      const json = (await response.json().catch(() => null)) as unknown;
      if (response.ok) {
        if (
          typeof json === "object" &&
          json !== null &&
          "contributionId" in json &&
          typeof json.contributionId === "string" &&
          json.contributionId.trim().length > 0
        ) {
          return { ok: true, contributionId: json.contributionId };
        }

        return {
          ok: false,
          message:
            "送金前の準備に失敗しました。時間をおいてもう一度お試しください。",
        };
      }

      if (
        typeof json === "object" &&
        json !== null &&
        "message" in json &&
        typeof json.message === "string" &&
        json.message.trim().length > 0
      ) {
        return { ok: false, message: json.message };
      }

      return {
        ok: false,
        message:
          response.status === 503
            ? "現在サーバーが混み合っているため、送金後の記録を保証できません。時間をおいてもう一度お試しください。"
            : "送金前の確認に失敗しました。時間をおいてもう一度お試しください。",
      };
    } catch {
      return {
        ok: false,
        message:
          "送金前の確認に失敗しました。通信状況を確認して、もう一度お試しください。",
      };
    }
  }

  async function cancelReservedContribution(
    contributionId: string | null | undefined
  ): Promise<void> {
    if (!contributionId) return;

    try {
      await fetch(
        `/api/contributions/preflight/${encodeURIComponent(contributionId)}`,
        {
          method: "PATCH",
          cache: "no-store",
        }
      );
    } catch {
      // ignore cancellation errors
    }
  }

  async function resolveProjectIdsFromServer(): Promise<{
    activeProjectId: string | null;
    projectIdsByCurrency: {
      JPYC: string | null;
      USDC: string | null;
    };
  } | null> {
    try {
      const response = await fetch(
        `/api/public/creator?username=${encodeURIComponent(username)}`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) return null;

      const json = (await response.json().catch(() => null)) as unknown;
      if (!isRecord(json) || json.ok !== true || !isRecord(json.projectIdsByCurrency)) {
        return null;
      }

      const nextProjectIdsByCurrency = {
        JPYC:
          typeof json.projectIdsByCurrency.JPYC === "string"
            ? json.projectIdsByCurrency.JPYC
            : null,
        USDC:
          typeof json.projectIdsByCurrency.USDC === "string"
            ? json.projectIdsByCurrency.USDC
            : null,
      };
      const nextActiveProjectId =
        typeof json.activeProjectId === "string" ? json.activeProjectId : null;

      setResolvedProjectIdsByCurrency(nextProjectIdsByCurrency);
      setFallbackProjectId(nextActiveProjectId);

      return {
        activeProjectId: nextActiveProjectId,
        projectIdsByCurrency: nextProjectIdsByCurrency,
      };
    } catch {
      return null;
    }
  }

  async function ensureActiveProjectIdForSend(): Promise<string | null> {
    const currentProjectId =
      resolvedProjectIdsByCurrency[currency] ?? fallbackProjectId ?? null;
    if (currentProjectId) {
      return currentProjectId;
    }

    const refreshed = await resolveProjectIdsFromServer();
    if (!refreshed) return null;

    return (
      refreshed.projectIdsByCurrency[currency] ??
      refreshed.activeProjectId ??
      null
    );
  }

  function mapContributionFailureMessage(reason: string): string {
    if (reason === "HTTP_503" || reason === "FETCH_FAILED") {
      return "送金は完了しましたが、記録の反映に失敗しました。しばらくしてからこのページを開き直すと再確認します。";
    }

    return `送金は完了しましたが、記録の反映に失敗しました（${reason}）。しばらくしてからこのページを開き直してください。`;
  }

  async function persistContributionRecord(
    lastTx: LastTx,
    fromAddressOverride?: string
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!lastTx.projectId) {
      return { ok: false, message: "送金先プロジェクトを確認できませんでした。" };
    }

    const token = getTokenOnChain(
      lastTx.currency,
      lastTx.chainId as SupportedChainId
    );
    if (!token) {
      return { ok: false, message: "トークン設定が見つかりません。" };
    }

    let fromAddress = fromAddressOverride;
    if (!fromAddress) {
      const pc = getPublicClientForChain(lastTx.chainId);
      if (!pc) {
        return { ok: false, message: "送金の確認に必要なチェーン接続が見つかりません。" };
      }

      const tx = await pc.getTransaction({ hash: lastTx.txHash });
      fromAddress = tx.from;
    }

    const contributionResult = await onPostContribution({
      contributionId: lastTx.contributionId ?? undefined,
      projectId: lastTx.projectId,
      purposeId: lastTx.purposeId ?? undefined,
      postId: lastTx.postId ?? undefined,
      chainId: lastTx.chainId,
      currency: lastTx.currency,
      tokenAddress: token.address,
      txHash: lastTx.txHash,
      fromAddress,
      toAddress: lastTx.toAddress,
      amount: lastTx.amount,
    });

    if (!contributionResult.ok) {
      return {
        ok: false,
        message: mapContributionFailureMessage(contributionResult.reason),
      };
    }

    await onAfterSend(lastTx.txHash, lastTx.postId);
    return { ok: true };
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
    let reservedContributionId: string | null = null;
    let transferStarted = false;

    try {
      setSending(true);
      setStatus("送金内容を確認しています…");

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

      const projectIdForSend = await ensureActiveProjectIdForSend();

      if (projectIdForSend) {
        setStatus("送金前の確認をしています…");
        const preflight = await ensureContributionPreflight({
          projectId: projectIdForSend,
          purposeId,
          postId: selectedPostId,
          chainId: selectedChainId,
          currency,
          fromAddress: sender,
          toAddress,
          amount: amtStr,
          amountRaw: value.toString(),
          decimals,
        });

        if (!preflight.ok) {
          setStatus(preflight.message);
          return;
        }

        reservedContributionId = preflight.contributionId;
      } else {
        setStatus(
          "送金先プロジェクトを読み込めませんでした。ページを開き直してから、もう一度お試しください。"
        );
        return;
      }

      setStatus("送金中…ウォレットで承認してください");
      const tx = await token.transfer(toAddress, value);
      transferStarted = true;

      saveLastTx({
        contributionId: reservedContributionId,
        txHash: tx.hash as `0x${string}`,
        chainId: selectedChainId,
        currency,
        amount: amtStr,
        toAddress,
        projectId: projectIdForSend,
        purposeId: purposeId ?? null,
        postId: selectedPostId ?? null,
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

      const persistResult = await persistContributionRecord(
        {
          contributionId: reservedContributionId,
          txHash: tx.hash as `0x${string}`,
          chainId: selectedChainId,
          currency,
          amount: amtStr,
          toAddress,
          projectId: projectIdForSend,
          purposeId: purposeId ?? null,
          postId: selectedPostId ?? null,
          createdAtMs: Date.now(),
        },
        sender
      );

      if (!persistResult.ok) {
        setStatus(persistResult.message);
        return;
      }

      clearLastTx();
      void refreshGoalProgress();

      void fetchWalletBalances();

      const short = tx.hash.slice(0, 10);
      const unit = currency === "JPYC" ? "円 / JPY" : "USD";
      setStatus(`完了：${amtStr} ${unit} を送金しました（Tx: ${short}…）`);
    } catch (e) {
      if (!transferStarted) {
        await cancelReservedContribution(reservedContributionId);
      }
      const msg = getErrorMessage(e);
      setStatus(`${msg}。もう一度お試しください。`);
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
        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
          <div className="p-4">
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-500">
                  応援の目安
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {creator.goalTitle}
                </p>
              </div>
              <div className="text-right text-xs text-gray-600">
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
                  <span>読み込み中です</span>
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

            <div className="mt-2 text-[11px] leading-relaxed text-gray-500">
              <p>
                アドレス確認:&nbsp;
                <a
                  className="underline hover:no-underline break-all"
                  href={profileAddressUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {requiredChainConfig
                    ? `${requiredChainConfig.shortName} で見る`
                    : "ブロックチェーンで見る"}
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
        selectedPostSummary={selectedPostSummary}
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
        onClearSelectedPost={onClearSelectedPost}
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

      <p className="mt-4 min-h-6 text-center text-sm text-gray-700" aria-live="polite">
        {status}
      </p>
    </>
  );
}
