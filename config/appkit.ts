// /config/appkit.ts
import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  polygon,
  avalanche,
  type AppKitNetwork,
} from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!;
if (!projectId) throw new Error("Missing NEXT_PUBLIC_PROJECT_ID");

// default は env で制御（例: 43114）
const required = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "43114");

// mainnet-only の候補（順序は好みでOK）
const allMainnets: AppKitNetwork[] = [avalanche, polygon, mainnet];

// defaultNetwork を先頭に寄せる（AppKit のUI初期値）
const defaultNetwork =
  allMainnets.find((n) => Number(n.id) === required) ?? avalanche;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  defaultNetwork,
  ...allMainnets.filter((n) => Number(n.id) !== Number(defaultNetwork.id)),
];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
