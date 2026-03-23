"use client";

import type { AgentTaskFollowThroughAuditAction } from "@/lib/agentTaskAudit";

const FOLLOW_THROUGH_ENDPOINT = "/api/agent/tasks/follow-through";

function buildFollowThroughBody(args: {
  address: string;
  taskId: string;
  action: AgentTaskFollowThroughAuditAction;
}): string {
  return JSON.stringify({
    address: args.address,
    taskId: args.taskId,
    action: args.action,
  });
}

export function recordAgentTaskFollowThrough(args: {
  address: string | null;
  taskId: string;
  action: AgentTaskFollowThroughAuditAction;
  keepalive?: boolean;
}): void {
  if (typeof window === "undefined" || !args.address) {
    return;
  }

  void fetch(FOLLOW_THROUGH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: args.keepalive === true,
    body: buildFollowThroughBody({
      address: args.address,
      taskId: args.taskId,
      action: args.action,
    }),
  }).catch(() => undefined);
}
