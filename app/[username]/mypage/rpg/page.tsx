// app/[username]/mypage/rpg/page.tsx
import { RpgProfileTab } from "@/components/profile/RpgProfileTab";
import { RpgExpToastContainer } from "@/components/profile/RpgExpToast";

type Params = { username: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  return {
    title: `RPGプロフィール | ${username}`,
  };
}

export default async function RpgPage({ params }: { params: Promise<Params> }) {
  await params; // username is available if needed for future use

  return (
    <div className="container-narrow py-6 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          RPGプロフィール
        </h1>
        <p className="text-xs text-gray-400">最近30日の活動をもとに更新</p>
      </div>
      <RpgExpToastContainer />
      <RpgProfileTab />
    </div>
  );
}
