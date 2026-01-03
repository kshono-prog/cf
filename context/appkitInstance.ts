// context/appkitInstance.ts
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/config/appkit";

// module scope で 1回だけ生成して保持
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    // metadata は Provider 側で上書きしたいならここは仮でOK
    name: "Creator Founding",
    description: "JPYCでクリエイターを応援できる投げ銭プラットフォーム",
    url: "https://example.invalid",
    icons: ["https://example.invalid/icon/icon-cf.png"],
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
