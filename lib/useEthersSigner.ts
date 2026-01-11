"use client";
import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import type { BrowserProvider, Eip1193Provider } from "ethers";

export function useEthersProvider() {
  const { data: wallet } = useWalletClient();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // Wagmi の walletClient.transport は EIP-1193 互換
  useEffect(() => {
    let cancelled = false;

    if (!wallet) {
      setProvider(null);
      return () => {
        cancelled = true;
      };
    }

    const eip1193 = wallet.transport as unknown as Eip1193Provider;

    void (async () => {
      const { ethers } = await import("ethers");
      if (!cancelled) {
        setProvider(new ethers.BrowserProvider(eip1193));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return provider;
}
