// app/[username]/mypage/page.tsx
import { redirect } from "next/navigation";

type Params = { username: string };

export default async function MyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  redirect(`/${username}/mypage/home`);
}
