import { headers } from "next/headers";

import AppKitProvider from "@/context/AppKitProvider";
import { PublicBottomNavLoader } from "@/components/layout/PublicBottomNavLoader";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

type Props = {
  children: React.ReactNode;
};

export const preferredRegion = "syd1";

export default async function CreatorsLayout({ children }: Props) {
  const requestCookies = (await headers()).get("cookie");

  return (
    <AppKitProvider cookies={requestCookies}>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <AppHeader username="" avatarUrl={null} />
          <div className="px-3 pb-[78px] pt-[60px] sm:px-6 sm:pt-[82px] md:pb-24">
            <div className="mx-auto w-full max-w-[1040px]">{children}</div>
          </div>
        </div>
        <PublicBottomNavLoader />
      </ThemeProvider>
    </AppKitProvider>
  );
}
