import BottomNav from "@/components/BottomNav";
import { prisma } from "@/lib/prisma";

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
    const profile = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { themeColor: true },
    });

    themeColor = profile?.themeColor ?? themeColor;
  } catch (e) {
    console.error("Failed to resolve theme color:", e);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav themeColor={themeColor} username={username} />
    </div>
  );
}
