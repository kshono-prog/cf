import type { ReactNode } from "react";

import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { PublicWorkspaceRightRail } from "@/components/layout/PublicWorkspaceRightRail";
import {
  PublicProfilePageSidebar,
  type PublicSidebarPage,
} from "@/components/profile/PublicProfilePageSidebar";
import type { SupportProfileView } from "@/lib/supportProfileView";
import type { SerializedPublicAiManagerProfile } from "@/lib/serializers/aiManager";
import type { CreatorProfile } from "@/types/creator";

type Props = {
  username: string;
  currentPage: PublicSidebarPage;
  creator: CreatorProfile;
  children: ReactNode;
  rightPanel?: ReactNode;
  supportShortcutHref?: string | null;
  supportProfileView?: SupportProfileView | null;
  publicAiManager?: SerializedPublicAiManagerProfile | null;
  feedContentClassName?: string;
};

export function PublicWorkspaceShell({
  username,
  currentPage,
  creator,
  children,
  rightPanel,
  supportShortcutHref = null,
  supportProfileView = null,
  publicAiManager = null,
  feedContentClassName = "",
}: Props) {
  return (
    <PublicPageShell username={username} fullBleed hideDesktopHeader>
      <div className="workspace-layout">
        <aside className="profile-sidebar print:hidden">
          <PublicProfilePageSidebar
            username={username}
            creatorWalletAddress={creator.address ?? null}
            themeColor={creator.themeColor ?? null}
            supportHref={null}
            supportShortcutHref={supportShortcutHref}
            currentPage={currentPage}
            anchorTabs={[]}
          />
        </aside>

        <main className="workspace-feed print:border-r-0">
          <div className={`px-3 py-4 sm:px-6 ${feedContentClassName}`.trim()}>
            {children}
          </div>
        </main>

        <aside className="workspace-right print:hidden">
          {rightPanel ?? (
            <PublicWorkspaceRightRail
              username={username}
              creator={creator}
              supportShortcutHref={supportShortcutHref}
              publicAiManager={publicAiManager}
              supportProfileView={supportProfileView}
            />
          )}
        </aside>
      </div>
    </PublicPageShell>
  );
}
