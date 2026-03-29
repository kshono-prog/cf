// components/mypage/CreatorProfileSection.tsx
"use client";

import React from "react";
import { CreatorProfileEditForm } from "./CreatorProfileEditForm";
import { CreatorProfileViewCard } from "./CreatorProfileViewCard";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  assistantSection?: React.ReactNode;
  extraSections?: React.ReactNode;
  missingSetupHints?: string[];
};

export function CreatorProfileSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  if (!workspace.editingProfile) {
    return <CreatorProfileViewCard missingSetupHints={props.missingSetupHints} />;
  }

  return (
    <CreatorProfileEditForm
      assistantSection={props.assistantSection}
      extraSections={props.extraSections}
    />
  );
}
