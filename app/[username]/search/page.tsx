import { SearchPageClient } from "@/components/social/SearchPageClient";

type Params = {
  username: string;
};

export default async function SearchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  return <SearchPageClient username={username} />;
}
