//app/[username]/layout.tsx
export const revalidate = 300;
export const preferredRegion = "syd1";

import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import { PublicBottomNavLoader } from "@/components/layout/PublicBottomNavLoader";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernameLayout({ children, params }: Props) {
  const { username } = await params;
  const requestCookies = (await headers()).get("cookie");

  return (
    <AppKitProvider cookies={requestCookies}>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <AppHeader username={username} avatarUrl={null} />
          <div className="px-3 pb-[78px] pt-[60px] sm:px-6 sm:pt-[82px] md:pb-24">
            <div className="mx-auto w-full max-w-[760px]">{children}</div>
          </div>
        </div>
        <PublicBottomNavLoader username={username} />
      </ThemeProvider>
    </AppKitProvider>
  );
}
