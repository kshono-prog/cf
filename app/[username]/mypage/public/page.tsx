import { renderMyPageWorkspace } from "../renderMyPageWorkspace";

type Params = {
  username: string;
};

export default async function MyPagePublic({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;

  return renderMyPageWorkspace({
    username,
    initialWorkspaceView: "settings",
  });
}
