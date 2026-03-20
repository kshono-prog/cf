"use client";

import { CreatorReadyRoutePanel } from "@/components/mypage/CreatorReadyRoutePanel";
import { CreatorWorkspaceAiOfficePanel } from "@/components/mypage/CreatorWorkspaceAiOfficePanel";
import {
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";

export function CreatorReadySupportersRoute() {
  return (
    <CreatorReadyRoutePanel
      title="AIの提案と確認"
      description="AIが作成した告知・お礼の下書きを確認して承認または却下できます。"
    >
      <WorkspaceStatusNotice
        tone="info"
        title="承認するまで自動投稿や送金は行われません"
        description="AIが提案した内容を確認してから承認することで、実際の動作に反映されます。まずは承認待ちの提案から確認してください。"
      />
      <CreatorWorkspaceAiOfficePanel />
    </CreatorReadyRoutePanel>
  );
}
