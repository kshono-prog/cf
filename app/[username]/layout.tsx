//app/[username]/layout.tsx
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernameLayout({ children, params }: Props) {
  const { username } = await params;
  const headerObj = await headers();
  const cookies = headerObj.get("cookie");

  return (
    <AppKitProvider cookies={cookies}>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <AppHeader username={username} />
        <div className="px-4 pb-[88px] pt-[74px] sm:px-6 sm:pb-[96px] sm:pt-[82px]">
          <div className="mx-auto w-full max-w-[760px]">{children}</div>
        </div>
      </div>
      <BottomNav username={username} />
    </AppKitProvider>
  );
}
