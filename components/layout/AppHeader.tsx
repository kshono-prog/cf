"use client";

import Image from "next/image";
import Link from "next/link";

import { HeaderUserMenu } from "@/components/layout/HeaderUserMenu";
import { HeaderWalletMenu } from "@/components/layout/HeaderWalletMenu";

export function AppHeader({ username }: { username: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex h-[60px] w-full max-w-[760px] items-center justify-between px-3 sm:px-6">
        <Link href={`/${username}/home`} className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <Image
                src="/icon/icon-cf.png"
                alt="Creator Founding"
                width={24}
                height={24}
                className="h-6 w-6 rounded-[8px]"
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-[var(--text)]">
                Creator Founding
              </div>
              <div className="truncate text-[11px] leading-tight text-[var(--text-subtle)]">
                クリエイター応援SNS
              </div>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <HeaderWalletMenu username={username} />
          <HeaderUserMenu />
        </div>
      </div>
    </header>
  );
}
