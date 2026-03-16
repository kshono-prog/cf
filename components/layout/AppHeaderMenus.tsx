"use client";

import { useEffect, useState } from "react";

import { HeaderUserMenu } from "@/components/layout/HeaderUserMenu";
import { HeaderWalletMenu } from "@/components/layout/HeaderWalletMenu";

export function AppHeaderMenus({ username }: { username: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <>
        <div className="menu-trigger opacity-80" aria-hidden="true">
          <span className="text-sm font-semibold">ウォレット</span>
        </div>
        <div className="menu-trigger px-2 opacity-80" aria-hidden="true">
          <div className="h-7 w-7 rounded-full bg-[var(--surface-subtle)]" />
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderWalletMenu username={username} />
      <HeaderUserMenu />
    </>
  );
}
