"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState, type Config } from "wagmi";
import { wagmiConfig } from "@/config/appkit";

// これを import するだけで初期化は走る（副作用はファイルスコープで1回）
import "@/lib/appkitInstance";

const queryClient = new QueryClient();

export default function AppKitProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initial = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider
      config={wagmiConfig as Config}
      initialState={initial}
      reconnectOnMount={false}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
