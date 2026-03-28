import Link from "next/link";
import { headers } from "next/headers";

import AppKitProvider from "@/context/AppKitProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export default async function ManagerDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestCookies = (await headers()).get("cookie");

  return (
    <AppKitProvider cookies={requestCookies}>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]">
            <div className="mx-auto flex h-[60px] w-full max-w-[760px] items-center justify-between px-3 sm:px-6">
              <Link href="/" className="text-sm font-semibold text-[var(--text)]">
                Creator Founding
              </Link>
              <div className="text-xs text-[var(--text-subtle)]">
                Manager Desk
              </div>
            </div>
          </header>

          <div className="px-3 pb-[78px] pt-[60px] sm:px-6 sm:pb-[96px] md:pb-10">
            <div className="mx-auto w-full max-w-[760px]">{children}</div>
          </div>
        </div>
      </ThemeProvider>
    </AppKitProvider>
  );
}
