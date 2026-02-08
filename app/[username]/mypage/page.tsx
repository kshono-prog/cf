// app/[username]/mypage/page.tsx
import AccountPageClient from "./AccountPageClient";
import { notFound } from "next/navigation";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";

type Params = { username: string };

export default async function MyPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  const creator = await getCreatorProfileByUsername(username);
  if (!creator) notFound();

  return <AccountPageClient username={username} />;
}
