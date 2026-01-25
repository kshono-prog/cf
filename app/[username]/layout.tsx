//app/[username]/layout.tsx
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";

export default async function UsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerObj = await headers();
  const cookies = headerObj.get("cookie");

  return <AppKitProvider cookies={cookies}>{children}</AppKitProvider>;
}
