import type { PublicViewerState } from "@/lib/publicViewerState";

export function resolveComposeViewerLinks(args: {
  pageUsername: string;
  viewerState: PublicViewerState;
}): {
  viewerWorkspaceHref: string;
  ownComposeHref: string;
  ownProfileHref: string;
} {
  const viewerWorkspaceUsername =
    args.viewerState.creatorUsername ??
    args.viewerState.userUsername ??
    args.pageUsername;
  const viewerWorkspaceHref = `/${viewerWorkspaceUsername}/mypage`;
  const ownComposeHref = args.viewerState.creatorUsername
    ? `/${args.viewerState.creatorUsername}/compose`
    : viewerWorkspaceHref;
  const ownProfileHref = args.viewerState.creatorUsername
    ? `/${args.viewerState.creatorUsername}`
    : args.viewerState.userUsername
    ? `/${args.viewerState.userUsername}`
    : viewerWorkspaceHref;

  return {
    viewerWorkspaceHref,
    ownComposeHref,
    ownProfileHref,
  };
}
