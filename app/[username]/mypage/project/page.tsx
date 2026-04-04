import { renderMyPageWorkspace } from "../renderMyPageWorkspace";

type Params = { username: string };
type SearchParams = Record<string, string | string[] | undefined>;

export default async function MyPageProject({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  return renderMyPageWorkspace({
    username,
    initialWorkspaceView: "project",
    searchParams: resolvedSearchParams,
  });
}
