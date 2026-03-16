//app/[username]/layout.tsx
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernameLayout({ children, params }: Props) {
  const { username } = await params;
  const headerObj = await headers();
  const cookies = headerObj.get("cookie");
  const creator = await getCreatorProfileByUsername(username);
  const themeColor = creator?.creator.themeColor ?? null;

  return (
    <AppKitProvider cookies={cookies}>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
          <AppHeader
            username={username}
            avatarUrl={creator?.creator.avatarUrl ?? null}
          />
          <div className="px-3 pb-[78px] pt-[60px] sm:px-6 sm:pb-[96px] sm:pt-[82px]">
            <div className="mx-auto w-full max-w-[760px]">{children}</div>
          </div>
        </div>
        <BottomNav username={username} themeColor={themeColor} />
      </ThemeProvider>
    </AppKitProvider>
  );
}
