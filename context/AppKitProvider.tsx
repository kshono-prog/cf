"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState, type Config } from "wagmi";
import { wagmiConfig } from "@/config/appkit";
import { OwnerAuthProvider } from "@/context/OwnerAuthProvider";
import { OwnerSessionProvider } from "@/context/OwnerSessionProvider";

const queryClient = new QueryClient();

export default function AppKitProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  const initial = cookieToInitialState(wagmiConfig as Config, cookies ?? null);

  return (
    <WagmiProvider
      config={wagmiConfig as Config}
      initialState={initial}
      reconnectOnMount
    >
      <QueryClientProvider client={queryClient}>
        <OwnerAuthProvider>
          <OwnerSessionProvider>{children}</OwnerSessionProvider>
        </OwnerAuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
