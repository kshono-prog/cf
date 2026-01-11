//app/[username]/layout.tsx
import BottomNav from "@/components/BottomNav";
import SwipeNavigationArea from "@/components/SwipeNavigationArea";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";

type Params = { username: string };

export default async function UsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { username } = await params;

  let themeColor = "#005bbb";

  try {
    const creatorResult = await getCreatorProfileByUsername(username);
    themeColor = creatorResult?.creator.themeColor ?? themeColor;
  } catch (e) {
    console.error("Failed to resolve theme color:", e);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
      <SwipeNavigationArea username={username} className="flex-1 pb-24">
        {children}
      </SwipeNavigationArea>
      <BottomNav themeColor={themeColor} username={username} />
    </div>
  );
}
