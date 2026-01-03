// /config/appkit.ts
import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  polygon,
  polygonAmoy,
  type AppKitNetwork, // ← 型をインポート
} from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!;
if (!projectId) throw new Error("Missing NEXT_PUBLIC_PROJECT_ID");

const required = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "137");

// まず単体ネットワークを AppKitNetwork として確定
const selectedNetwork: AppKitNetwork =
  required === 80002 ? polygonAmoy : polygon;

// タプル型にする（最低1要素）
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [selectedNetwork];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks, // ← タプルのまま渡す
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
