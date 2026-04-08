//app/[username]/layout.tsx
export const revalidate = 300;
export const preferredRegion = "syd1";

import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

/**
 * [username] ルートグループの共通プロバイダー。
 * AppHeader・BottomNav・コンテンツ幅制限は各ページ／mypage layout が担う。
 */
export default async function UsernameLayout({ children, params }: Props) {
  void params; // mypage layout が params を使う
  const requestCookies = (await headers()).get("cookie");

  return (
    <AppKitProvider cookies={requestCookies}>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          {children}
        </div>
      </ThemeProvider>
    </AppKitProvider>
  );
}
