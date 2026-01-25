//app/[username]/layout.tsx
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import BottomNav from "@/components/BottomNav";

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
      <div className="min-h-screen pb-24">{children}</div>
      <BottomNav username={username} />
    </AppKitProvider>
  );
}
