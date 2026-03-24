"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";

import type { OwnerAuthSignMessage } from "@/lib/ownerAuthClient";
import {
  clearOwnerAuthSessionCache,
  registerOwnerAuthSigner,
} from "@/lib/ownerAuthClient";

export function OwnerAuthProvider(props: { children: ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const lastAddressRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const normalizedAddress = address ? address.toLowerCase() : null;
    registerOwnerAuthSigner(
      normalizedAddress,
      signMessageAsync as OwnerAuthSignMessage
    );

    if (lastAddressRef.current !== normalizedAddress) {
      clearOwnerAuthSessionCache();
      lastAddressRef.current = normalizedAddress;
    }

    return () => {
      registerOwnerAuthSigner(null, null);
    };
  }, [address, signMessageAsync]);

  return <>{props.children}</>;
}
