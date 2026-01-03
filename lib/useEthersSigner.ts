"use client";

import { useWalletClient } from "wagmi";
import { ethers } from "ethers";
import type { Eip1193Provider } from "ethers";

export function useEthersProvider() {
  const { data: wallet } = useWalletClient();
  if (!wallet) return null;

  // Wagmi の walletClient.transport は EIP-1193 互換
  const eip1193 = wallet.transport as unknown as Eip1193Provider;
  return new ethers.BrowserProvider(eip1193);
}
