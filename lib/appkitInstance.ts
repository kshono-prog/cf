// lib/appkitInstance.ts
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/config/appkit";

export const appkit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    name: "Creator Founding",
    description: "JPYCでクリエイターを応援できる投げ銭プラットフォーム",
    // 重要：ここは実運用では固定でも良いが、プレビュー混在なら origin を強く推奨
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons:
      typeof window !== "undefined"
        ? [`${window.location.origin}/icon/icon-cf.png`]
        : [],
  },
  features: { analytics: true, email: false, socials: false },
  themeMode: "light",
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
    "38633830ef578a1249c345848a8d6487551a346b923d21ce197ea57f423f3113", // hashport
    "19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927", // Ledger
    "walletConnect",
  ],
});
