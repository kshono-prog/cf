"use client";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

export function ManagerDeskRefreshingNotice(props: {
  title: string;
  description: string;
}) {
  return (
    <WorkspaceStatusNotice
      tone="info"
      title={props.title}
      description={props.description}
    />
  );
}

export function ManagerDeskStaleDataNotice(props: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceStatusNotice
      tone="error"
      title={props.title}
      description={props.description}
      onRetry={props.onRetry}
    />
  );
}

export function ManagerDeskMutationNotice(props: {
  tone: "success" | "error" | "info" | "attention";
  title: string;
  description?: string;
}) {
  return (
    <WorkspaceStatusNotice
      tone={props.tone}
      title={props.title}
      description={props.description}
    />
  );
}
