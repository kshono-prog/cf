"use client";

import { HeaderUserMenu } from "@/components/layout/HeaderUserMenu";
import { HeaderWalletMenu } from "@/components/layout/HeaderWalletMenu";

type AppHeaderMenusProps = {
  username: string;
  menuPlacement?: "bottom-end" | "top-start";
  triggerVariant?: "default" | "sidebar";
};

export function AppHeaderMenus({
  username,
  menuPlacement = "bottom-end",
  triggerVariant = "default",
}: AppHeaderMenusProps) {
  return (
    <>
      <HeaderWalletMenu
        username={username}
        menuPlacement={menuPlacement}
        triggerVariant={triggerVariant}
      />
      <HeaderUserMenu
        menuPlacement={menuPlacement}
        triggerVariant={triggerVariant}
      />
    </>
  );
}
