// lib/appkitInstance.ts
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/config/appkit";
import { getDefaultChainId } from "@/lib/chainConfig";

type Network = (typeof networks)[number];

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  if (typeof v === "string") {
    // 1) 純数値文字列: "43114"
    const direct = Number(v);
    if (Number.isFinite(direct)) return direct;

    // 2) CAIP形式: "eip155:43114" → 43114
    const m = v.match(/:(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    }

    return null;
  }

  return null;
}

function getChainIdFromNetwork(n: Network): number | null {
  // AppKitNetwork/CaipNetwork の実装差を吸収（id / chainId どちらでも拾う）
  const anyN = n as unknown as Record<string, unknown>;
  const id = toFiniteNumber(anyN.id);
  const chainId = toFiniteNumber(anyN.chainId);
  return id ?? chainId;
}

const defaultChainId = getDefaultChainId();

const defaultNetwork =
  networks.find((n) => getChainIdFromNetwork(n) === defaultChainId) ??
  networks[0];

export const appkit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork,
  metadata: {
    name: "Creator Founding",
    description: "JPYCでクリエイターを応援できる投げ銭プラットフォーム",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons:
      typeof window !== "undefined"
        ? [`${window.location.origin}/icon/icon-cf.png`]
        : [],
  },
  features: { analytics: true, email: false, socials: false },
  themeMode: "light",
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
    "38633830ef578a1249c345848a8d6487551a346b923d21ce197ea57f423f3113",
    "19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927",
    "walletConnect",
  ],
});

// // lib/appkitInstance.ts
// import { createAppKit } from "@reown/appkit/react";
// import { wagmiAdapter, projectId, networks } from "@/config/appkit";

// export const appkit = createAppKit({
//   adapters: [wagmiAdapter],
//   projectId,
//   networks,
//   defaultNetwork: networks[0],
//   metadata: {
//     name: "Creator Founding",
//     description: "JPYCでクリエイターを応援できる投げ銭プラットフォーム",
//     // 重要：ここは実運用では固定でも良いが、プレビュー混在なら origin を強く推奨
//     url: typeof window !== "undefined" ? window.location.origin : "",
//     icons:
//       typeof window !== "undefined"
//         ? [`${window.location.origin}/icon/icon-cf.png`]
//         : [],
//   },
//   features: { analytics: true, email: false, socials: false },
//   themeMode: "light",
//   featuredWalletIds: [
//     "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
//     "38633830ef578a1249c345848a8d6487551a346b923d21ce197ea57f423f3113", // hashport
//     "19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927", // Ledger
//     "walletConnect",
//   ],
// });
