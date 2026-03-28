"use client";

import { AgentTaskOutput } from "@/components/mypage/AgentTaskOutputViews";
import type { AgentTaskView } from "@/components/mypage/aiOfficeTypes";

function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", { year: "numeric", month: "long" });
}

export function CreatorReadyCashflowReportSection(props: {
  task: AgentTaskView | null;
  address: string | undefined;
}) {
  const { task, address } = props;

  if (!task || task.output == null) return null;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Finance Agent
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)]">今月の収支レポート</h2>
        </div>
        <div className="text-xs text-[var(--text-subtle)]">
          {formatMonth(task.createdAt)}
        </div>
      </div>

      <AgentTaskOutput
        taskType={task.taskType}
        output={task.output}
        projectId={task.projectId}
        taskId={task.id}
        walletAddress={address ?? null}
      />
    </section>
  );
}
