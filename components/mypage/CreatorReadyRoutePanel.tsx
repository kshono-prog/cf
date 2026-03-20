"use client";

import type { ReactNode } from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  title: string;
  description: string;
  error?: string | null;
  children: ReactNode;
};

export function CreatorReadyRoutePanel(props: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">{props.title}</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          {props.description}
        </div>
      </div>
      {props.error ? (
        <WorkspaceStatusNotice tone="error" title={props.error} />
      ) : null}
      {props.children}
    </div>
  );
}
