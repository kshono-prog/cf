// /config/appkit.ts
import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  polygon,
  avalanche,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import type { CustomRpcUrlMap } from "@reown/appkit-common";
import { getPublicEnv } from "@/lib/publicEnv";

const publicEnv = getPublicEnv();
export const projectId = publicEnv.projectId;

function withRpcOverride(network: AppKitNetwork, rpcUrl: string | null): AppKitNetwork {
  if (!rpcUrl) return network;
  const cloned = {
    ...network,
    rpcUrls: {
      ...(network.rpcUrls ?? {}),
      default: {
        ...((network.rpcUrls as { default?: { http?: string[] } } | undefined)
          ?.default ?? {}),
        http: [rpcUrl],
      },
      chainDefault: {
        ...((network.rpcUrls as { chainDefault?: { http?: string[] } } | undefined)
          ?.chainDefault ?? {}),
        http: [rpcUrl],
      },
    },
  };
  return cloned as AppKitNetwork;
}

// default は env で制御（例: 43114）
const required = publicEnv.defaultChainId;

const ethereumRpc = publicEnv.rpcUrlEthereum;
const polygonRpc = publicEnv.rpcUrlPolygon ?? "https://polygon-bor-rpc.publicnode.com";
const avalancheRpc = publicEnv.rpcUrlAvalanche;

// mainnet-only の候補（順序は好みでOK）
const allMainnets: AppKitNetwork[] = [
  withRpcOverride(avalanche, avalancheRpc),
  withRpcOverride(polygon, polygonRpc),
  withRpcOverride(mainnet, ethereumRpc),
];

// defaultNetwork を先頭に寄せる（AppKit のUI初期値）
const defaultNetwork =
  allMainnets.find((n) => Number(n.id) === required) ?? avalanche;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  defaultNetwork,
  ...allMainnets.filter((n) => Number(n.id) !== Number(defaultNetwork.id)),
];

const customRpcUrls: CustomRpcUrlMap = {
  ...(ethereumRpc ? { "eip155:1": [{ url: ethereumRpc }] } : {}),
  ...(polygonRpc ? { "eip155:137": [{ url: polygonRpc }] } : {}),
  ...(avalancheRpc ? { "eip155:43114": [{ url: avalancheRpc }] } : {}),
};

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  customRpcUrls,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
