"use client";

import EventManager from "@/components/EventManager";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorProfileEditEventsSection() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="text-base font-semibold text-[var(--text)]">
        イベント
      </div>
      <p className="mt-1 text-sm text-[var(--text-subtle)]">
        必要なときだけ、公開イベントや開催情報を追加できます。
      </p>
      <div className="mt-4">
        <EventManager
          username={workspace.meCreatorUsername}
          themeColor={workspace.themeColorValue}
          baseUrl={workspace.eventBaseUrl}
        />
      </div>
    </div>
  );
}
