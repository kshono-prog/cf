"use client";

import { HeaderUserMenu } from "@/components/layout/HeaderUserMenu";
import { HeaderWalletMenu } from "@/components/layout/HeaderWalletMenu";

export function AppHeaderMenus({ username }: { username: string }) {
  return (
    <>
      <HeaderWalletMenu username={username} />
      <HeaderUserMenu />
    </>
  );
}
